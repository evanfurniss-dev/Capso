// App/Sources/Preferences/Components/CheckForUpdatesView.swift
import AppKit
import SwiftUI
import SharedKit
import Sparkle

@MainActor
final class UpdateManager: NSObject, ObservableObject {
    enum StatusKind {
        case checking
        case success
        case error
    }

    struct Status {
        let message: String
        let kind: StatusKind
    }

    @Published private(set) var canCheckForUpdates = false
    @Published private(set) var status: Status?
    @Published var automaticallyChecksForUpdates: Bool = true {
        didSet {
            guard oldValue != automaticallyChecksForUpdates else { return }
            updater.automaticallyChecksForUpdates = automaticallyChecksForUpdates
        }
    }
    @Published var updateCheckFrequency: UpdateCheckFrequency = .daily {
        didSet {
            guard oldValue != updateCheckFrequency else { return }
            updater.updateCheckInterval = updateCheckFrequency.timeInterval
        }
    }
    /// Independent of `automaticallyChecksForUpdates`: switching background
    /// checks off must not disturb what the user chose here.
    @Published var automaticallyDownloadsUpdates: Bool = false {
        didSet {
            guard oldValue != automaticallyDownloadsUpdates else { return }
            updater.storedAutomaticallyDownloadsUpdates = automaticallyDownloadsUpdates
        }
    }

    private enum ManualCheckState {
        case none
        case probing
    }

    private var manualCheckState: ManualCheckState = .none
    private var probeFoundValidUpdate = false
    private var canCheckObservation: NSKeyValueObservation?
    private var autoCheckObservation: NSKeyValueObservation?
    private var autoDownloadObservation: NSKeyValueObservation?
    private var clearStatusTask: Task<Void, Never>?

    // This fork stays offline until it has its own feed and signing identity.
    // A separate implementation also ignores preferences from upstream installs.
    private let offlineUpdater = OfflineSoftwareUpdater()
    private let injectedUpdater: (any SoftwareUpdating)?

    var updater: any SoftwareUpdating { injectedUpdater ?? offlineUpdater }
    var updatesEnabled: Bool { injectedUpdater != nil }

    /// Tests can supply an updater without enabling network access in the app.
    init(updater: (any SoftwareUpdating)? = nil) {
        injectedUpdater = updater
        super.init()
        // Property observers don't run inside an initializer, so seeding these
        // never writes back to the updater.
        canCheckForUpdates = self.updater.canCheckForUpdates
        automaticallyChecksForUpdates = self.updater.automaticallyChecksForUpdates
        updateCheckFrequency = UpdateCheckFrequency(closestTo: self.updater.updateCheckInterval)
        automaticallyDownloadsUpdates = self.updater.storedAutomaticallyDownloadsUpdates
        startObservingSparkleUpdater()
    }

    /// Sparkle's properties are KVO-compliant; a stand-in updater is not, and
    /// keeps whatever state the test sets on it.
    private func startObservingSparkleUpdater() {
        guard let sparkleUpdater = updater as? SPUUpdater else { return }

        canCheckObservation = sparkleUpdater.observe(\.canCheckForUpdates, options: [.initial, .new]) { [weak self] updater, _ in
            Task { @MainActor in
                self?.canCheckForUpdates = updater.canCheckForUpdates
            }
        }
        autoCheckObservation = sparkleUpdater.observe(\.automaticallyChecksForUpdates, options: [.new]) { [weak self] updater, _ in
            Task { @MainActor in
                self?.automaticallyChecksForUpdates = updater.automaticallyChecksForUpdates
            }
        }
        // Sparkle's own update dialog can flip the auto-install preference, so
        // stay in sync with it — but re-read the stored value rather than the
        // masked one this notification carries.
        autoDownloadObservation = sparkleUpdater.observe(\.automaticallyDownloadsUpdates, options: [.new]) { [weak self] updater, _ in
            Task { @MainActor in
                self?.automaticallyDownloadsUpdates = updater.storedAutomaticallyDownloadsUpdates
            }
        }
    }

    func checkForUpdates() {
        guard updater.canCheckForUpdates else { return }
        clearStatusTask?.cancel()
        manualCheckState = .probing
        probeFoundValidUpdate = false
        status = Status(message: String(localized: "Checking…"), kind: .checking)
        updater.checkForUpdateInformation()
    }

    private func showStatus(_ message: String, kind: StatusKind, autoDismissAfter: Duration? = .seconds(4)) {
        clearStatusTask?.cancel()
        status = Status(message: message, kind: kind)

        guard let autoDismissAfter else { return }
        clearStatusTask = Task { @MainActor [weak self] in
            try? await Task.sleep(for: autoDismissAfter)
            guard !Task.isCancelled else { return }
            self?.status = nil
        }
    }

    private func clearManualProbeState() {
        manualCheckState = .none
        probeFoundValidUpdate = false
    }

    // MARK: Manual probe outcomes
    //
    // Split out from the `SPUUpdaterDelegate` callbacks, whose signatures require
    // a live `SPUUpdater`, so the manual-check flow stays testable.

    /// The silent probe found an update, so the interactive flow can take over.
    func handleProbeFoundUpdate() {
        guard manualCheckState == .probing else { return }
        probeFoundValidUpdate = true
        status = nil
    }

    /// The silent probe found nothing.
    func handleProbeFoundNoUpdate(error: any Error) {
        guard manualCheckState == .probing else { return }
        let message = error.localizedDescription.isEmpty ? String(localized: "You’re up to date!") : error.localizedDescription
        showStatus(message, kind: .success)
    }

    /// The silent probe was aborted. Sparkle reports "no update found" this way
    /// too (error 1001), which `handleProbeFoundNoUpdate` has already covered.
    func handleProbeAborted(error: any Error) {
        guard manualCheckState == .probing else { return }
        let nsError = error as NSError
        guard !(nsError.domain == SUSparkleErrorDomain && nsError.code == 1001) else { return }
        showStatus(error.localizedDescription, kind: .error, autoDismissAfter: .seconds(6))
    }

    /// The silent probe finished. Hand over to Sparkle's interactive flow when
    /// there is something to install.
    ///
    /// This is user-initiated, so Sparkle always presents the update rather than
    /// installing it silently, whatever the automatic check and install settings
    /// happen to be.
    func handleProbeFinished(error: (any Error)?) {
        guard manualCheckState == .probing else { return }

        let shouldLaunchInteractiveFlow = probeFoundValidUpdate && error == nil
        clearManualProbeState()

        guard shouldLaunchInteractiveFlow else { return }
        status = nil
        updater.checkForUpdates()
    }
}

extension UpdateManager: SPUUpdaterDelegate {
    func updater(_ updater: SPUUpdater, didFindValidUpdate item: SUAppcastItem) {
        handleProbeFoundUpdate()
    }

    func updaterDidNotFindUpdate(_ updater: SPUUpdater, error: Error) {
        handleProbeFoundNoUpdate(error: error)
    }

    func updater(_ updater: SPUUpdater, didAbortWithError error: Error) {
        handleProbeAborted(error: error)
    }

    func updater(_ updater: SPUUpdater, didFinishUpdateCycleFor updateCheck: SPUUpdateCheck, error: (any Error)?) {
        guard updateCheck == .updateInformation else { return }
        handleProbeFinished(error: error)
    }
}

/// A SwiftUI wrapper around Capso's update manager that keeps manual
/// no-update feedback non-modal so the app remains capturable.
struct CheckForUpdatesView: View {
    @ObservedObject var updateManager: UpdateManager

    var body: some View {
        VStack(alignment: .trailing, spacing: 6) {
            Button("Check for Updates") {
                updateManager.checkForUpdates()
            }
            .disabled(!updateManager.canCheckForUpdates)
            .controlSize(.small)

            if let status = updateManager.status {
                HStack(spacing: 6) {
                    switch status.kind {
                    case .checking:
                        ProgressView()
                            .controlSize(.small)
                    case .success:
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    case .error:
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.yellow)
                    }

                    Text(status.message)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.trailing)
                }
                .frame(maxWidth: 220, alignment: .trailing)
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: updateManager.status?.message)
    }
}
