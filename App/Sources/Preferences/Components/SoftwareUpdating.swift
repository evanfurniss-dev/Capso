// App/Sources/Preferences/Components/SoftwareUpdating.swift
import Foundation
import Sparkle

/// The slice of Sparkle's updater that Capso drives.
///
/// `UpdateManager` talks to this instead of `SPUUpdater` directly so its behaviour
/// can be unit tested without starting a real updater. `SPUUpdater` is already
/// main-actor isolated (`NS_SWIFT_UI_ACTOR`), matching this protocol's isolation.
@MainActor
protocol SoftwareUpdating: AnyObject {
    /// Whether the user can start an update check right now.
    var canCheckForUpdates: Bool { get }
    /// Whether Sparkle checks for updates in the background.
    var automaticallyChecksForUpdates: Bool { get set }
    /// The stored "install updates automatically" preference.
    ///
    /// Deliberately not `SPUUpdater.automaticallyDownloadsUpdates`: that getter
    /// reports `false` whenever automatic checks are off, which would drag the
    /// two settings around together.
    var storedAutomaticallyDownloadsUpdates: Bool { get set }
    /// How often background checks run, in seconds.
    var updateCheckInterval: TimeInterval { get set }

    /// Silently fetches update information without showing Sparkle's UI.
    func checkForUpdateInformation()
    /// Runs a user-initiated check, showing Sparkle's UI.
    func checkForUpdates()
}

/// Reads and writes Sparkle's persisted "install updates automatically"
/// preference, bypassing `SPUUpdater`'s accessors for it.
///
/// Both of Sparkle's accessors are gated on `allowsAutomaticUpdates`, which is
/// itself tied to `automaticallyChecksForUpdates`: the getter reports `false`
/// and the setter silently drops the write while background checks are off
/// (`SPUUpdaterSettings.setAutomaticallyDownloadsUpdates:`). Capso keeps the two
/// settings independent, so it goes to the stored value directly. Sparkle
/// observes this key and picks the change up on its own.
enum AutomaticInstallPreference {
    static let key = "SUAutomaticallyUpdate"

    /// - Parameter fallback: The bundle's `SUAutomaticallyUpdate` value, used
    ///   until the user has made a choice.
    static func value(in defaults: UserDefaults, fallback: Bool?) -> Bool {
        defaults.object(forKey: key) as? Bool ?? fallback ?? false
    }

    static func setValue(_ newValue: Bool, in defaults: UserDefaults) {
        defaults.set(newValue, forKey: key)
    }
}

extension SPUUpdater: SoftwareUpdating {
    var storedAutomaticallyDownloadsUpdates: Bool {
        get {
            AutomaticInstallPreference.value(
                in: .standard,
                fallback: Bundle.main.object(forInfoDictionaryKey: AutomaticInstallPreference.key) as? Bool
            )
        }
        set { AutomaticInstallPreference.setValue(newValue, in: .standard) }
    }
}

/// Safe default for the fork before an independently signed update channel exists.
@MainActor
final class OfflineSoftwareUpdater: SoftwareUpdating {
    let canCheckForUpdates = false
    var automaticallyChecksForUpdates: Bool {
        get { false }
        set { }
    }
    var storedAutomaticallyDownloadsUpdates: Bool {
        get { false }
        set { }
    }
    var updateCheckInterval: TimeInterval = 86_400
    func checkForUpdateInformation() { }
    func checkForUpdates() { }
}
