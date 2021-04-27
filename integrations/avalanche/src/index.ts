import {
  UploadFunctionSubscriber,
  ListenFunctionObservable,
  ValidateFunctionSubscriber,
} from "@kyve/core/dist/faces";
import Web3 from "web3";
import hash from "object-hash";
import KYVE, { getData } from "@kyve/core";
import { JWKInterface } from "arweave/node/lib/wallet";

const upload = async (uploader: UploadFunctionSubscriber, config: any) => {
  const client = new Web3(
    new Web3.providers.WebsocketProvider(config.endpoint)
  );

  client.eth.subscribe("newBlockHeaders").on("data", async (blockHeader) => {
    const tags = [
      { name: "Block", value: blockHeader.hash },
      { name: "Height", value: blockHeader.number.toString() },
    ];

    let block = await client.eth.getBlock(blockHeader.hash, true);

    block.transactions.map((transaction) =>
      tags.push({ name: "Transaction", value: transaction.hash })
    );

    uploader.next({ data: block, tags });
  });
};

const validate = async (
  listener: ListenFunctionObservable,
  validator: ValidateFunctionSubscriber,
  config: any
) => {
  const client = new Web3(
    new Web3.providers.WebsocketProvider(config.endpoint)
  );

  listener.subscribe(async (res) => {
    const height = parseFloat(
      res.transaction.tags.find((tag) => tag.name === "Height")?.value!
    );

    const block = await client.eth.getBlock(height, true);
    const localHash = hash(block);

    const data = await getData(res.id);
    const compareHash = hash(JSON.parse(data.toString()));

    validator.next({ valid: localHash === compareHash, id: res.id });
  });
};

export default function main(pool: number, stake: number, jwk: JWKInterface) {
  const instance = new KYVE(
    {
      pool,
      stake,
      jwk,
    },
    upload,
    validate
  );

  return instance;
}