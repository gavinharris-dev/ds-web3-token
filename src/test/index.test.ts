/// <reference types="jest" />

import Loader from "../cardano/Loader";
import { sign, verify } from "..";

class BIP39Loader {
  private _wasm: typeof import("bip39");

  async load() {
    if (this._wasm) return;

    this._wasm = await import("bip39");
  }

  get BIP39() {
    return this._wasm;
  }
}

const bip39Load = new BIP39Loader();

beforeAll(async () => {
  await bip39Load.load();
  await Loader.load();
});

const MNEMONICS =
  "crowd captain hungry tray powder motor coast oppose month shed parent mystery torch resemble index";

test("We can sign and verify CIP30 compliant Data", async () => {
  console.log();

  const signedMsg = await sign((msg: string) => {
    return signDataCIP30(Buffer.from(msg).toString("hex"));
  }, "Dropspot");

  await verify(signedMsg);
});

test("If you mess with the signed token, you cannot validate", async () => {
  console.log();

  const signedMsg = await sign((msg: string) => {
    return signDataCIP30(Buffer.from(msg).toString("hex"));
  }, "Dropspot");

  await expect(
    verify(`${signedMsg.substring(0, 20)}INJECT${signedMsg.substring(20)}`)
  ).rejects.toThrow();
});

export const signDataCIP30 = async (msg: string) => {
  await Loader.load();

  const entropy = bip39Load.BIP39.mnemonicToEntropy(MNEMONICS);
  const wallet = Loader.Cardano.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, "hex"),
    Buffer.from("")
  );
  // const master_key = wallet.to_raw_key().to_bech32();

  let account = wallet
    .derive(1852 | 0x80000000)
    .derive(1815 | 0x80000000)
    .derive(0 | 0x80000000);
  // let account_public = account.to_public();

  const paymentKey = account.derive(0).derive(0).to_raw_key();
  const stakeKey = account.derive(2).derive(0).to_raw_key();

  const paymentKeyHash = paymentKey.to_public().hash();
  const stakeKeyHash = stakeKey.to_public().hash();

  const paymentAddr = Loader.Cardano.BaseAddress.new(
    Loader.Cardano.NetworkInfo.mainnet().network_id(),
    Loader.Cardano.StakeCredential.from_keyhash(paymentKeyHash),
    Loader.Cardano.StakeCredential.from_keyhash(stakeKeyHash)
  ).to_address();

  const address = Buffer.from(paymentAddr.to_bytes()).toString("hex");

  const protectedHeaders = Loader.Message.HeaderMap.new();
  protectedHeaders.set_algorithm_id(
    Loader.Message.Label.from_algorithm_id(Loader.Message.AlgorithmId.EdDSA)
  );
  // protectedHeaders.set_key_id(publicKey.as_bytes()); // Removed to adhere to CIP-30
  protectedHeaders.set_header(
    Loader.Message.Label.new_text("address"),
    Loader.Message.CBORValue.new_bytes(Buffer.from(address, "hex"))
  );
  const protectedSerialized =
    Loader.Message.ProtectedHeaderMap.new(protectedHeaders);
  const unprotectedHeaders = Loader.Message.HeaderMap.new();
  const headers = Loader.Message.Headers.new(
    protectedSerialized,
    unprotectedHeaders
  );
  const builder = Loader.Message.COSESign1Builder.new(
    headers,
    Buffer.from(msg, "hex"),
    false
  );
  const toSign = builder.make_data_to_sign().to_bytes();

  const signedSigStruc = paymentKey.sign(toSign).to_bytes();
  const coseSign1 = builder.build(signedSigStruc);

  const key = Loader.Message.COSEKey.new(
    Loader.Message.Label.from_key_type(Loader.Message.KeyType.OKP)
  );
  key.set_algorithm_id(
    Loader.Message.Label.from_algorithm_id(Loader.Message.AlgorithmId.EdDSA)
  );
  key.set_header(
    Loader.Message.Label.new_int(
      Loader.Message.Int.new_negative(Loader.Message.BigNum.from_str("1"))
    ),
    Loader.Message.CBORValue.new_int(
      Loader.Message.Int.new_i32(6) //Loader.Message.CurveType.Ed25519
    )
  ); // crv (-1) set to Ed25519 (6)
  key.set_header(
    Loader.Message.Label.new_int(
      Loader.Message.Int.new_negative(Loader.Message.BigNum.from_str("2"))
    ),
    Loader.Message.CBORValue.new_bytes(paymentKey.to_public().as_bytes())
  ); // x (-2) set to public key

  return {
    signature: Buffer.from(coseSign1.to_bytes()).toString("hex"),
    key: Buffer.from(key.to_bytes()).toString("hex"),
  };
};
