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
    let hasAudio: Bool
    let audioDuration: Double
    let audioChunks: [VideoShareAudioChunk]
    let audioPreparationFailed: Bool

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
            let audioTracks = try await asset.loadTracks(withMediaType: .audio)
            var audioDuration: Double = 0
            for track in audioTracks {
                let range = try await track.load(.timeRange)
                audioDuration = max(audioDuration, min(duration, range.end.seconds))
            }
            let hasAudio = !audioTracks.isEmpty && audioDuration.isFinite && audioDuration > 0
            var chunks: [VideoShareAudioChunk] = []
            var audioPreparationFailed = false
            if hasAudio {
                do {
                    guard audioDuration <= 7200 else { throw ShareError.unknown("Automatic transcription supports recordings up to two hours.") }
                    for index in 0..<Int(ceil(audioDuration / 60)) {
                        let start = Double(index) * 60
                        let length = min(60, audioDuration - start)
                        let audioFile = directory.appendingPathComponent(String(format: "audio-%04d.m4a", index))
                        guard let audioSession = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else {
                            throw ShareError.unknown("Could not prepare recording audio.")
                        }
                        audioSession.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), duration: CMTime(seconds: length, preferredTimescale: 600))
                        try await audioSession.export(to: audioFile, as: .m4a)
                        chunks.append(VideoShareAudioChunk(file: audioFile, start: start, duration: length))
                    }
                } catch {
                    // Keep video sharing available if audio preparation fails.
                    for chunk in chunks { try? FileManager.default.removeItem(at: chunk.file) }
                    chunks = []
                    audioPreparationFailed = true
                }
            }
            return VideoShareAssets(directory: directory, poster: poster, playback: playback, duration: duration, hasAudio: hasAudio, audioDuration: audioDuration, audioChunks: chunks, audioPreparationFailed: audioPreparationFailed)
        } catch {
            try? FileManager.default.removeItem(at: directory)
            throw error
        }
    }

    func removeTemporaryFiles() { try? FileManager.default.removeItem(at: directory) }
}

struct VideoShareAudioChunk {
    let file: URL
    let start: Double
    let duration: Double
}
