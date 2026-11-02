# Fork security review

Reviewed upstream main at the parent commit of this change on 2026-11-02.

## Verified findings

Capso pinned Sparkle 2.9.1. Sparkle lists five security advisories that affect
that version. The fixes arrived in 2.9.2, 2.9.5, and 2.9.6. This fork pins
2.10.1, the current stable release at review time.

- https://github.com/sparkle-project/Sparkle/security/advisories
- https://github.com/sparkle-project/Sparkle/discussions/2838
- https://github.com/sparkle-project/Sparkle/releases/tag/2.10.1

The delta archive attacks require an attacker to supply a correctly signed
malicious update. Other attacks require local malware and specific race or
privilege conditions. The reviewed release workflow publishes full DMGs.
This review does not establish exploitation of Capso.

The inherited appcast URL and EdDSA public key gave the upstream maintainer
control over this fork's update channel. The fork now uses an offline updater
and omits both values. Saved update preferences cannot start Sparkle. A new
update channel requires a separate implementation change, an owner-controlled
feed, a new EdDSA key pair, and signing and installation tests.

The release workflow could write an empty EdDSA signature when its key or signer
was missing. It now stops in that case. This was a release validation defect;
it does not establish that Sparkle accepted an unsigned update. Nested code
signing errors now stop the build. The inherited release job is disabled for
fork repositories because it writes to upstream publishing destinations.

The fork uses `io.startsmooth.capso` for its app, Keychain services, and stored
history. Upstream preferences and credentials are not migrated. Set an Apple
team explicitly for a signed release. This change creates no signing keys.

## Connect R2

The existing Cloud Share wizard supports R2 directly with AWS SigV4. Credentials
are stored in macOS Keychain. No upload proxy is needed.

1. Select a dedicated bucket and its Cloudflare account.
2. Create an R2 S3 token with Object Read & Write permission scoped to that
   bucket. Keep its secret out of Git and chat.
3. Configure the bucket's public HTTPS URL. Public bucket access exposes objects
   to anyone who has a link. Use a dedicated sharing bucket to limit exposure.
   Obtain explicit approval before exposing an existing private bucket.
4. In Preferences > Cloud Share, select Cloudflare R2. Enter the account ID,
   bucket, public URL prefix, Access Key ID, and Secret Access Key.
5. Run Test Connection. It writes a small test object, reads it through the
   public URL, then deletes it. Check both success and cleanup.
6. Upload a disposable image manually and open the returned link. Keep automatic
   uploads off unless the owner enables them.

The R2 implementation targets the default jurisdiction endpoint. A bucket in
an EU, US, or FedRAMP jurisdiction needs endpoint support before connection.

- https://developers.cloudflare.com/r2/api/tokens/
- https://developers.cloudflare.com/r2/buckets/public-buckets/

## Verification limits

`xcodegen generate`, plist validation, static trust checks, and Git whitespace
checks passed locally. After Xcode license acceptance, the Debug build passed
with Sparkle 2.10.1. All 53 ShareKit tests, 279 SharedKit tests, and 29 selected
updater tests passed. The updater tests cover offline behavior and removal of
upstream trust.

The configured R2 destination passed an upload, public read, and deletion test
using the app's actual R2 code. Credentials were saved in macOS Keychain and
verified by readback. Automatic uploads remain off. Account and bucket settings
are stored locally and are excluded from this repository.

The running app's Cloud Share settings showed the selected R2 bucket. Its
Test Connection action reported success and confirmed test file cleanup.
The General settings showed update controls disabled.
