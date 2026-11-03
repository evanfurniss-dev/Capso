import AVFoundation
import Foundation
import ImageIO
import UniformTypeIdentifiers

/// A poster and a broadly compatible playback copy. The original remains unchanged.
struct VideoShareAssets {
    let directory: URL
    let poster: URL
    let playback: URL
    let duration: Double

    static func prepare(file: URL) async throws -> VideoShareAssets {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("capso-share-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        do {
            let asset = AVURLAsset(url: file)
            let duration = try await asset.load(.duration).seconds
            guard duration.isFinite, duration > 0 else {
                throw ShareError.unknown("The recording has no playable video.")
            }
            let generator = AVAssetImageGenerator(asset: asset)
            generator.appliesPreferredTrackTransform = true
            generator.maximumSize = CGSize(width: 1200, height: 630)
            let (image, _) = try await generator.image(at: CMTime(seconds: min(1, duration / 2), preferredTimescale: 600))
            let poster = directory.appendingPathComponent("poster.jpg")
            guard let destination = CGImageDestinationCreateWithURL(poster as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
                throw ShareError.unknown("Could not create the video poster.")
            }
            CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
            guard CGImageDestinationFinalize(destination) else {
                throw ShareError.unknown("Could not save the video poster.")
            }
            let playback = directory.appendingPathComponent("playback.mp4")
            guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPreset1920x1080) else {
                throw ShareError.unknown("Could not prepare the video for sharing.")
            }
            session.shouldOptimizeForNetworkUse = true
            try await session.export(to: playback, as: .mp4)
            return VideoShareAssets(directory: directory, poster: poster, playback: playback, duration: duration)
        } catch {
            try? FileManager.default.removeItem(at: directory)
            throw error
        }
    }

    func removeTemporaryFiles() { try? FileManager.default.removeItem(at: directory) }
}
