import Foundation

public actor R2Destination: ShareDestination {
    private let config: ShareConfig
    private let accessKey: String
    private let secretKey: String

    public init(config: ShareConfig, accessKey: String, secretKey: String) {
        self.config = config
        self.accessKey = accessKey
        self.secretKey = secretKey
    }

    public nonisolated func publicURL(for key: String) -> URL {
        let objectKey = config.objectKey(for: key)
        if usesVideoPages, key.lowercased().hasSuffix(".mp4") {
            let id = String(key.dropLast(4))
            return URL(string: "\(config.urlPrefix)/v/\(ShareConfig.encodeObjectKey(id))")!
        }
        return config.publicURL(forObjectKey: objectKey)
    }

    private nonisolated var usesVideoPages: Bool {
        config.value("videoPages") == "true" && config.pathPrefix == nil
    }

    public func upload(file: URL, key: String, contentType: String) async throws -> URL {
        let assets: VideoShareAssets?
        if usesVideoPages, key.lowercased().hasSuffix(".mp4") {
            assets = try await VideoShareAssets.prepare(file: file)
        } else {
            assets = nil
        }
        defer { assets?.removeTemporaryFiles() }
        let objectKey = config.objectKey(for: key)
        let target = S3CompatibleHTTP.r2Target(
            accountID: config.accountID,
            bucket: config.bucket,
            objectKey: objectKey
        )
        // R2 ignores region for routing; SigV4 still requires a region string.
        try await S3CompatibleHTTP.putObject(
            file: file,
            target: target,
            region: "auto",
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
            contentType: contentType
        )
        if let assets {
            let id = String(key.dropLast(4))
            try await putAsset(assets.poster, key: "assets/\(id)/poster.jpg", contentType: "image/jpeg")
            try await putAsset(assets.playback, key: "assets/\(id)/playback.mp4", contentType: "video/mp4")
            let metadata = assets.directory.appendingPathComponent("metadata.json")
            let details: [String: Any] = ["title": "Screen recording", "description": "", "duration": assets.duration]
            try JSONSerialization.data(withJSONObject: details).write(to: metadata)
            try await putAsset(metadata, key: "metadata/\(id).json", contentType: "application/json")
        }
        return publicURL(for: key)
    }

    private func putAsset(_ file: URL, key: String, contentType: String) async throws {
        try await S3CompatibleHTTP.putObject(
            file: file,
            target: S3CompatibleHTTP.r2Target(accountID: config.accountID, bucket: config.bucket, objectKey: key),
            region: "auto", accessKeyId: accessKey, secretAccessKey: secretKey, contentType: contentType
        )
    }

    public func delete(key: String) async throws {
        let objectKey = config.objectKey(for: key)
        let target = S3CompatibleHTTP.r2Target(
            accountID: config.accountID,
            bucket: config.bucket,
            objectKey: objectKey
        )
        try await S3CompatibleHTTP.deleteObject(
            target: target,
            region: "auto",
            accessKeyId: accessKey,
            secretAccessKey: secretKey
        )
        if usesVideoPages, key.lowercased().hasSuffix(".mp4") {
            let id = String(key.dropLast(4))
            for assetKey in ["assets/\(id)/poster.jpg", "assets/\(id)/playback.mp4", "metadata/\(id).json"] {
                try await S3CompatibleHTTP.deleteObject(
                    target: S3CompatibleHTTP.r2Target(accountID: config.accountID, bucket: config.bucket, objectKey: assetKey),
                    region: "auto", accessKeyId: accessKey, secretAccessKey: secretKey
                )
            }
        }
    }

    public func validateConfig() async throws {
        let testID = IDGenerator.shortID()
        let testKey = "_capso_test_\(testID).txt"
        let tmpFile = FileManager.default.temporaryDirectory.appendingPathComponent(testKey)
        try "ok".write(to: tmpFile, atomically: true, encoding: .utf8)
        defer { try? FileManager.default.removeItem(at: tmpFile) }

        let publicURL = try await upload(file: tmpFile, key: testKey, contentType: "text/plain")

        // Round-trip: fetch via public URL to confirm public access is enabled
        var request = URLRequest(url: publicURL)
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            try? await delete(key: testKey)
            throw ShareError.publicAccessUnreachable
        }
        guard String(data: data, encoding: .utf8) == "ok" else {
            try? await delete(key: testKey)
            throw ShareError.publicAccessUnreachable
        }

        try await delete(key: testKey)
    }
}
