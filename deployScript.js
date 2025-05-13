const dotenv = require("dotenv");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const { SuiClient, getFullnodeUrl } = require("@mysten/sui/client");
const path = require("path");
const { fileURLToPath } = require("url");
const { execSync } = require("child_process");
const { Transaction } = require("@mysten/sui/transactions");
const { performance } = require("perf_hooks");
const { writeFileSync, readFileSync } = require("fs");

dotenv.config();
const secretKey = process.env.PRIVATE_KEY;
if (!secretKey) {
  console.log("Error: DEPLOYER_B64_secretKey not set as env variable.");
  process.exit(1);
}

const network = process.env.NETWORK;
let bytes32Key = Buffer.from(secretKey, "hex");
const keypair = Ed25519Keypair.fromSecretKey(bytes32Key);
const client = new SuiClient({ url: getFullnodeUrl(network) });

const suiAddress = keypair.toSuiAddress();

async function deployContract(contractPath, tomlPath) {
    const path_to_contracts = path.join(
        path.dirname(__filename), // Changed from fileURLToPath
        contractPath
      );
    
      const path_to_toml = path.join(
        path.dirname(__filename), // Changed from fileURLToPath
        tomlPath
      );

  if (tomlPath.includes("roz_contract")) {
    let fileContent = readFileSync(path_to_toml, "utf-8");
    fileContent = fileContent.replace(/roz_contract\s*=\s*".*?"/, `roz_contract = "0x0"`);
    writeFileSync(path_to_toml, fileContent, "utf-8");
  }

  console.log("Building move code...");
  const { modules, dependencies } = JSON.parse(
    execSync(
      `export DYLD_LIBRARY_PATH=/usr/lib:/usr/local/lib
      sui move build --dump-bytecode-as-base64 --path ${path_to_contracts} --skip-fetch-latest-git-deps`,
      { encoding: "utf-8" }
    )
  );

  console.log("Deploying from address:", suiAddress);

  const deploy_trx = new Transaction();

  const [upgradeCap] = deploy_trx.publish({
    modules,
    dependencies,
  });

  deploy_trx.transferObjects(
    [upgradeCap],
    deploy_trx.pure.address(
    suiAddress
    )
  );
  const parse_cost = (amount) => Math.abs(parseInt(amount)) / 1_000_000_000;
  const start = performance.now();
  const { objectChanges, balanceChanges } =
    await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: deploy_trx,
      options: {
        showBalanceChanges: true,
        showEffects: true,
        showEvents: true,
        showInput: false,
        showObjectChanges: true,
        showRawInput: false,
      },
    });
  const end = performance.now();
  console.log("Time Took: ", (end - start) / 1000, " seconds");

  if (balanceChanges) {
    console.log("Cost to deploy:", parse_cost(balanceChanges[0].amount), "SUI");
  }

  const published_event = objectChanges.find((obj) => obj.type == "published");
  if (published_event?.type != "published") {
    console.error("Failed to deploy contract");
    process.exit(1);
  }
  let fileContent = readFileSync(path_to_toml, "utf-8");
  fileContent = fileContent.replace(
    /published-at\s*=\s*".*?"/,
    `published-at = "${published_event.packageId}"`
  );

  if (path_to_toml.includes("roz_contract")) {
    fileContent = fileContent.replace(
      /roz_contract\s*=\s*".*?"/,
      `roz_contract = "${published_event.packageId}"`
    );
  }
  writeFileSync(path_to_toml, fileContent, "utf-8");
  return [objectChanges, published_event.packageId];
}

async function deployRozContract() {
  try {
    const [_, rozContract_package_id] = await deployContract(
      "./roz_contract/",
      "./roz_contract/Move.toml"
    );
    console.log({ rozContract_package_id });
    console.log("Writing addresses to json...");
    
    writeFileSync(network+"DeployedAddress.json", JSON.stringify({rozContract_package_id}, null, 4));

  } catch (error) {
    console.log({ error });
  }
}

async function main() {
  await deployRozContract();
}

main();