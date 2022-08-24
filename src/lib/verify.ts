import Loader from "../cardano/Loader";
import type {
  Address,
  Ed25519Signature,
  PublicKey,
} from "@emurgo/cardano-serialization-lib-browser";

export async function verify(token: string) {
  await Loader.load();

  const buf = Buffer.from(token, "base64");

  try {
    const { signature, key } = JSON.parse(buf.toString()) as {
      body: string;
      signature: string;
      key?: string;
    };

    let publicKey: PublicKey;
    let address: Address;

    let ed25519Sig: Ed25519Signature;
    if (key) {
      const message = Loader.Message.COSESign1.from_bytes(
        Buffer.from(signature, "hex")
      );
      const coseKey = Loader.Message.COSEKey.from_bytes(
        Buffer.from(key, "hex")
      );

      const headermap = message.headers().protected().deserialized_headers();
      address = Loader.Cardano.Address.from_bytes(
        headermap.header(Loader.Message.Label.new_text("address")).as_bytes()
      );
      publicKey = Loader.Cardano.PublicKey.from_bytes(
        coseKey
          .header(
            Loader.Message.Label.new_int(
              Loader.Message.Int.new_negative(
                Loader.Message.BigNum.from_str("2")
              )
            )
          )
          .as_bytes()
      );
      ed25519Sig = Loader.Cardano.Ed25519Signature.from_bytes(
        message.signature()
      );

      console.log(
        "Test PubKey 1",
        publicKey.verify(message.signed_data().to_bytes(), ed25519Sig)
      );
    } else {
      const x = Loader.Message.COSESignature.from_bytes(
        Buffer.from(signature, "hex")
      );

      const headers = x.headers().protected();

      const headersMap = headers.deserialized_headers();
      // listHeaders(headersMap.keys(), headersMap);

      address = Loader.Cardano.Address.from_bytes(
        headersMap.header(Loader.Message.Label.new_text("address")).as_bytes()
      );

      publicKey = Loader.Cardano.PublicKey.from_bytes(headersMap.key_id());

      // console.log("signature", Buffer.from(x.signature()).toString("hex"));

      // listHeaders(x.headers().unprotected().keys(), x.headers().unprotected());
    }

    if (!verifyAddress(address, publicKey)) {
      throw new Error("Unable to validate provided Token");
    }

    // console.log(body);
    // if (!publicKey.verify(Buffer.from(body), ed25519Sig)) {
    //   throw new Error(
    //     `Message integrity check failed (has the message been tampered with?)`
    //   );
    // }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// function listHeaders(keys: Labels, headers: HeaderMap) {
//   for (let i = 0; i < keys.len(); i++) {
//     console.log(
//       "Key",
//       i,
//       keys.get(i).kind() === Loader.Message.LabelKind.Text
//         ? keys.get(i).as_text()
//         : keys.get(i).as_int()?.as_i32()
//     );

//     const header = headers.header(keys.get(i));

//     switch (header.kind()) {
//       case Loader.Message.CBORValueKind.Bytes.valueOf():
//         console.log(
//           "Header Bytes",
//           Buffer.from(header.as_bytes()).toString("hex")
//         );
//         break;
//       case Loader.Message.CBORValueKind.Special.valueOf():
//         console.log(
//           "Header Special",
//           header.as_special().kind(),
//           header.as_special().as_bool()
//         );
//         break;
//       case Loader.Message.CBORValueKind.Int.valueOf():
//         console.log("Header Int", header.as_int().as_i32());
//         break;
//       default:
//         console.log("Header?", header.kind());
//     }
//   }
// }

const verifyAddress = (checkAddress: Address, publicKey: PublicKey) => {
  try {
    //reconstruct address

    const paymentKeyHash = publicKey.hash();

    const baseAddress = Loader.Cardano.BaseAddress.from_address(checkAddress);
    const stakeKeyHash = baseAddress.stake_cred().to_keyhash();

    const reconstructedAddress = Loader.Cardano.BaseAddress.new(
      checkAddress.network_id(),
      Loader.Cardano.StakeCredential.from_keyhash(paymentKeyHash),
      Loader.Cardano.StakeCredential.from_keyhash(stakeKeyHash)
    );

    const status =
      checkAddress.to_bech32() ===
      reconstructedAddress.to_address().to_bech32();

    return {
      status,
      msg: status
        ? "Valid Address"
        : "Base Address does not validate to Reconstructed address",
      code: 1,
    };
  } catch (e) {
    console.error("Err verifyAddress", e);
    throw e;
  }
};

// const signature =
//   "845869a30127045820a18ce138a75b2ee9452e1bd9a060168f18ab4d4faf951d05740672f3d834ad8d6761646472657373583900d3970009fb58780f0d607d6d85402f664316225f0537935bfc638d068516af9cbb80965421a17f4e0f061809662121a02540dc82439d43e9a166686173686564f441aa58407e86b223eda2c14c30c47664588aa869092c80bfa0108d4f26dcc202b1a86b41b7abd171ce763cada0e70fd9ebba95a2cdcc3ef4481db79cc78e205cf9169807";

// const body = "AA";

// verify(
//   Buffer.from(
//     JSON.stringify({
//       body,
//       signature,
//     })
//   ).toString("base64")
// );

// const TEST2 =
//   "eyJzaWduYXR1cmUiOiI4NDU4NDZhMjAxMjc2NzYxNjQ2NDcyNjU3MzczNTgzOTAwZDAwNmViNzc4M2U4YzkzMTYwYjJiYWIyODdiYzhhNmYwNjllOWU2OTBjZDgyYmMwYjUyYThjMzE3MzBkODA1YjZhMmNmNjc5OThmMGZjZDA3MGNlMGI2ZTg1OTU3ZmQ3NThjZjBhZTM0OGQyNjVlYmExNjY2ODYxNzM2ODY1NjRmNDU4NDA1NzY1NjIzMzJkNTQ2ZjZiNjU2ZTJkNTY2NTcyNzM2OTZmNmUzYTIwMzEwYTQ1Nzg3MDY5NzI2NTJkNDQ2MTc0NjUzYTIwNTc2NTY0MmMyMDMyMzQyMDQxNzU2NzIwMzIzMDMyMzIyMDMwMzkzYTMxMzUzYTMyMzMyMDQ3NGQ1NDU4NDA5ZDcwNjAzN2JhNDQwNjg0MGYzMGVhMWM1Y2VmYzFhNDJkNTQ5OWIxNmVkZDE5M2E1NTY0ZmZkNjE2ZjRlMjMwYzFhOTk3ZjA2YzMxMjZhMGU5MzQ3N2E4NzY0OTg3NmRkZTQ2ZTk2MzA3ODdlODAxNWIyYmVkYWE5NGMzOTgwMyIsImtleSI6ImE0MDEwMTAzMjcyMDA2MjE1ODIwZGM2YzIxY2I5ZjVmOTZjN2I5OTMyMjM3Nzc4ZTA1M2RjMjczYTE0ODRlYzA1Nzc1OTQ2YTQzOTczOWNlYjBlYSIsImJvZHkiOiJXZWIzLVRva2VuLVZlcnNpb246IDFcbkV4cGlyZS1EYXRlOiBXZWQsIDI0IEF1ZyAyMDIyIDA5OjE1OjIzIEdNVCJ9";

// verify(TEST2);

/*
[
    h'a30127045820a18ce138a75b2ee9452e1bd9a060168f18ab4d4faf951d05740672f3d834ad8d6761646472657373583900d3970009fb58780f0d607d6d85402f664316225f0537935bfc638d068516af9cbb80965421a17f4e0f061809662121a02540dc82439d43e9',
    {"hashed": false},
    h'aa',
    h'7e86b223eda2c14c30c47664588aa869092c80bfa0108d4f26dcc202b1a86b41b7abd171ce763cada0e70fd9ebba95a2cdcc3ef4481db79cc78e205cf9169807',
]

*/
