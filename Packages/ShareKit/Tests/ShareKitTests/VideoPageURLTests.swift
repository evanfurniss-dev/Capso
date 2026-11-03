import Foundation
import Testing
@testable import ShareKit

@Suite("Video page links")
struct VideoPageURLTests {
    @Test("Video page links are enabled explicitly and keep image links unchanged")
    func enabledLinks() {
        let config = ShareConfig(provider: .r2, urlPrefix: "https://content.example.com", bucket: "videos", fields: ["accountID": "account", "videoPages": "true"])
        let destination = R2Destination(config: config, accessKey: "test", secretKey: "test")
        #expect(destination.publicURL(for: "abc1234.mp4").absoluteString == "https://content.example.com/v/abc1234")
        #expect(destination.publicURL(for: "abc1234.png").absoluteString == "https://content.example.com/abc1234.png")
    }

    @Test("Existing R2 configurations continue to return original file links")
    func existingLinks() {
        let config = ShareConfig(provider: .r2, urlPrefix: "https://content.example.com", accountID: "account", bucket: "videos")
        let destination = R2Destination(config: config, accessKey: "test", secretKey: "test")
        #expect(destination.publicURL(for: "abc1234.mp4").absoluteString == "https://content.example.com/abc1234.mp4")
    }
}
