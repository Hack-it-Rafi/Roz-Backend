const { getFaucetHost, requestSuiFromFaucetV2 }  = require('@mysten/sui/faucet');

const DEVNET_ADDRESS_ADMIN = "0xef72cb4baaf878f0db211273d230842db87c36ecf1f9493a77a9c5af1c596df5";
const DEVNET_ADDRESS_NON_ADMIN = "0x63e08cd2bd1f30c8beb02e0afb47995a120f76f8cab3dcca7207e831e1c087d4";

const TESTNET_ADDRESS = "0x79afaebe242005f72c2689bb1253cd204310c83f645aef974f6d39e548328e09";

async function getBalanceFromFaucetDevnet(address, nTimes) {
    for (let index = 0; index < nTimes; index++) {
      console.log({index});
      const res = await requestSuiFromFaucetV2({
        host: getFaucetHost("devnet"),
        recipient: address,
      });
    }
}

async function getBalanceFromFaucetTestnet(nTimes) {
    for (let index = 0; index < nTimes; index++) {
      console.log({index});
      await requestSuiFromFaucetV2({
        host: getFaucetHost("testnet"),
        recipient: TESTNET_ADDRESS,
      });
    }
}

async function main() {
    // Fill balance with faucet with N*10 Sui coins in devnet
    await getBalanceFromFaucetDevnet(DEVNET_ADDRESS_ADMIN, 100);
    // await getBalanceFromFaucetDevnet(DEVNET_ADDRESS_NON_ADMIN, 500);
  
    // Fill balance with faucet with N Sui coins in testnet
    // await getBalanceFromFaucetTestnet(100)
  }
  
  main();
  