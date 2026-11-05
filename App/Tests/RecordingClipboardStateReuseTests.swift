import SharedKit
@testable import Capso
import XCTest

final class RecordingClipboardStateReuseTests: XCTestCase {
    @MainActor
    func testPreviewAndAutomaticUploadReusePendingAndFinishedLink() async throws {
        let settings = AppSettings(defaults: UserDefaults(suiteName: UUID().uuidString)!)
        let coordinator = RecordingCoordinator(settings: settings)
        let source = URL(fileURLWithPath: "/tmp/library-link-recording.mov")
        let link = URL(string: "https://content.example.test/v/abc1234")!
        var uploads = 0
        let upload: @MainActor () async throws -> URL = {
            uploads += 1
            try await Task.sleep(for: .milliseconds(30))
            return link
        }
        async let automatic = coordinator.sharedRecordingUpload(for: source, upload: upload)
        async let preview = coordinator.sharedRecordingUpload(for: source, upload: upload)
        let results = try await [automatic, preview]
        XCTAssertEqual(results, [link, link])
        let repeated = try await coordinator.sharedRecordingUpload(for: source, upload: upload)
        XCTAssertEqual(repeated, link)
        XCTAssertEqual(uploads, 1)
    }

    @MainActor
    func testFailedLibraryUploadCanBeRetried() async throws {
        let coordinator = RecordingCoordinator(settings: AppSettings(defaults: UserDefaults(suiteName: UUID().uuidString)!))
        let source = URL(fileURLWithPath: "/tmp/retry-recording.mov")
        do {
            _ = try await coordinator.sharedRecordingUpload(for: source) { throw NSError(domain: "Upload", code: 1) }
            XCTFail("Expected upload failure")
        } catch {}
        let link = URL(string: "https://content.example.test/v/retry12")!
        let retry = try await coordinator.sharedRecordingUpload(for: source) { link }
        XCTAssertEqual(retry, link)
    }

    func testFinishedAutomaticCopyCanBeRestoredWithoutReencoding() throws {
        var state = RecordingClipboardState()
        XCTAssertFalse(state.canReuseAutomaticCopy)

        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("RecordingClipboardStateReuseTests.\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }

        let fileURL = directory.appendingPathComponent("capso_clipboard.mp4")
        try Data([0x00, 0x01]).write(to: fileURL)
        state.markCopied(fileURL)

        XCTAssertTrue(state.canReuseAutomaticCopy)
        let pasteboard = NSPasteboard(name: NSPasteboard.Name("RecordingClipboardStateReuseTests.\(UUID().uuidString)"))
        pasteboard.clearContents()
        XCTAssertTrue(RecordingClipboard.copy(
            fileURL: try XCTUnwrap(state.copiedFileURL),
            cleaningDirectory: directory,
            pasteboard: pasteboard
        ))

        let copied = pasteboard.readObjects(
            forClasses: [NSURL.self],
            options: [.urlReadingFileURLsOnly: true]
        ) as? [URL]
        XCTAssertEqual(copied, [fileURL])
        XCTAssertTrue(FileManager.default.fileExists(atPath: fileURL.path))
    }
}
