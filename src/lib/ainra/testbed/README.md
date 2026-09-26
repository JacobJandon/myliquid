# AINRA testbed artifacts

These five files are copied unchanged from the AINRA reference implementation's external verifier kit
(`kits/verifier/sample-artifacts/` in https://github.com/JacobJandon/ainra, licensed Apache-2.0 OR MIT):

- `roots.json`: the **TEST-ROOT** public keys (Ed25519 + SLH-DSA). Not a production root: AINRA's production
  root does not exist until its genesis ceremony.
- `directory.json`: the root-signed directory of accredited registrars (here `registrar-07`).
- `bundle-valid.json`, `bundle-revoked.json`: two presentations of the passport
  `ainra:registrar-07:acme:invoicing@1.0.0`, one valid and one revoked.
- `meta.json`: the unix time the samples were issued. Their stapled revocation status is only fresh for five
  minutes after that, so MyLiquid verifies them **at that time** when running in testbed mode, and says so.

MyLiquid uses them when no real trust anchors are configured (`AINRA_ROOTS_FILE`, `AINRA_DIRECTORY_FILE`).
Everything verified against them is labelled `TESTBED · TEST-ROOT`.
