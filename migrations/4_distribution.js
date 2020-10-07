var fs = require('fs')

// ============ Contracts ============

// Protocol
// deployed first
const BENTOImplementation = artifacts.require("BENTODelegate");
const BENTOProxy = artifacts.require("BENTODelegator");

// deployed second
const BENTOReserves = artifacts.require("BENTOReserves");
const BENTORebaser = artifacts.require("BENTORebaser");

// deployed third
const Gov = artifacts.require("GovernorAlpha");
const Timelock = artifacts.require("Timelock");

// deployed fourth
const BENTO_LINKPool = artifacts.require("BENTOLINKPool");

// deployed fifth
const BENTOIncentivizer = artifacts.require("BENTOIncentivizer");

// ============ Main Migration ============

const migration = async (deployer, network, accounts) => {
  await Promise.all([
    // deployTestContracts(deployer, network),
    deployDistribution(deployer, network, accounts),
    // deploySecondLayer(deployer, network)
  ]);
}

module.exports = migration;

// ============ Deploy Functions ============


async function deployDistribution(deployer, network, accounts) {
  console.log(network)
  let bento = await BENTOProxy.deployed();
  let yReserves = await BENTOReserves.deployed()
  let yRebaser = await BENTORebaser.deployed()
  let tl = await Timelock.deployed();
  let gov = await Gov.deployed();
  if (network != "test") {
    await deployer.deploy(BENTOIncentivizer, {overwrite: false});
    await deployer.deploy(BENTO_LINKPool, {overwrite: false});

    let link_pool = new web3.eth.Contract(BENTO_LINKPool.abi, BENTO_LINKPool.address);
    let ycrv_pool = new web3.eth.Contract(BENTOIncentivizer.abi, BENTOIncentivizer.address);

    console.log("setting distributor");
    const account = await web3.eth.getAccounts();
    const accountAddress = await account[0];
    await Promise.all([
        link_pool.methods.setRewardDistribution(accountAddress).send({from: accountAddress, gas: 100000}),
        ycrv_pool.methods.setRewardDistribution(accountAddress).send({from: accountAddress, gas: 100000}),
      ]);

    let twenty = web3.utils.toBN(10**3).mul(web3.utils.toBN(10**18)).mul(web3.utils.toBN(15));
    let one_five = web3.utils.toBN(10**3).mul(web3.utils.toBN(10**18)).mul(web3.utils.toBN(100));

    console.log("transfering and notifying");
    console.log("eth");
    await Promise.all([
      bento.transfer(BENTO_LINKPool.address, twenty.toString()),
      bento._setIncentivizer(BENTOIncentivizer.address),
    ]);

    await Promise.all([
      link_pool.methods.notifyRewardAmount(twenty.toString()).send({from:accountAddress, gas: 500000}),

      // incentives is a minter and prepopulates itself.
      ycrv_pool.methods.notifyRewardAmount("0").send({from: accountAddress, gas: 500000}),
    ]);

    await Promise.all([
      link_pool.methods.setRewardDistribution(Timelock.address).send({from: accountAddress, gas: 100000}),
      ycrv_pool.methods.setRewardDistribution(Timelock.address).send({from: accountAddress, gas: 100000}),
    ]);

    await Promise.all([
      link_pool.methods.transferOwnership(Timelock.address).send({from: accountAddress, gas: 100000}),
      ycrv_pool.methods.transferOwnership(Timelock.address).send({from: accountAddress, gas: 100000}),
    ]);
  }

  await Promise.all([
    bento._setPendingGov(Timelock.address),
    yReserves._setPendingGov(Timelock.address),
    yRebaser._setPendingGov(Timelock.address),
  ]);

  await Promise.all([
      tl.executeTransaction(
        BENTOProxy.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),

      tl.executeTransaction(
        BENTOReserves.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),

      tl.executeTransaction(
        BENTORebaser.address,
        0,
        "_acceptGov()",
        "0x",
        0
      ),
  ]);
  await tl.setPendingAdmin(Gov.address);
  await gov.__acceptAdmin();
  await gov.__abdicate();
}
