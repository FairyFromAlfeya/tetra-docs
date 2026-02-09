# Testing and debugging TON Smart Contracts with Tycho Executor

Short guide on how to test and debug TON smart contracts using `@ton/sandbox` with a custom `TychoExecutor` and on‑chain network config.

---

## 1. Prerequisites

Install required dev dependencies:

```bash
npm install -D @ton-api/client @tychosdk/emulator
```

You should also have a standard Blueprint/Sandbox setup (e.g. `@ton/sandbox`, `@ton/core`, `@ton/test-utils`) already in your project.

## 2. Initializing Blockchain with Tycho

```ts
import { TonApiClient } from '@ton-api/client';
import { TychoExecutor } from '@tychosdk/emulator';

beforeEach(async () => {
  const tonapi = new TonApiClient({ baseUrl: 'https://tetra.tonapi.io/' });

  // Get real blockchain config from system contract
  const configAccount = await tonapi.blockchain.getBlockchainRawAccount(
    Address.parse('-1:5555555555555555555555555555555555555555555555555555555555555555'),
  );

  const config = configAccount.data!.asSlice().loadRef();

  // Create local tycho executor with tetra config
  blockchain = await Blockchain.create({
    executor: await TychoExecutor.create(),
    config,
  });
});
```

Key points:
1. config is loaded from the on‑chain config contract account so tests match real network parameters.
2. TychoExecutor replaces the default executor, but Blockchain usage stays the same (you still use openContract, treasury, etc.).

## 3. Simple contract test

```ts
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { Sample } from '../wrappers/Sample';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { TonApiClient } from '@ton-api/client';
import { TychoExecutor } from '@tychosdk/emulator';

describe('Sample', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Sample');
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let sample: SandboxContract<Sample>;

  beforeEach(async () => {
    const tonapi = new TonApiClient({ baseUrl: 'https://tetra.tonapi.io/' });

    const configAccount = await tonapi.blockchain.getBlockchainRawAccount(
      Address.parse('-1:5555555555555555555555555555555555555555555555555555555555555555'),
    );

    const config = configAccount.data!.asSlice().loadRef();

    blockchain = await Blockchain.create({
      executor: await TychoExecutor.create(),
      config,
    });

    sample = blockchain.openContract(
      Sample.createFromConfig(
        {
          id: 0,
          counter: 0,
        },
        code,
      ),
    );

    deployer = await blockchain.treasury('deployer');

    const deployResult = await sample.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: sample.address,
      deploy: true,
      success: true,
    });
  });

  it('should increase counter', async () => {
    const increaser = await blockchain.treasury('increaser');

    const counterBefore = await sample.getCounter();
    const increaseBy = Math.floor(Math.random() * 100);

    const increaseResult = await sample.sendIncrease(increaser.getSender(), {
      increaseBy,
      value: toNano('0.05'),
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: increaser.address,
      to: sample.address,
      success: true,
    });

    const counterAfter = await sample.getCounter();

    expect(counterAfter).toBe(counterBefore + increaseBy);
  });
});

```

## 4. Running tests and debugging

- Run tests (Blueprint):
    ```bash
    # Run all tests
    npx blueprint test
    
    # Run specific test
    npx blueprint test Sample
    
    # With gas report
    npx blueprint test --gas-report
    ```
- For debugging:
  - Log `res.transactions` to inspect messages and status.
  - Check TVM exit codes (exitCode, actionResultCode) when you expect failures.
  - Keep each test isolated by creating a fresh Blockchain in beforeEach.


## 5. Full TON testing documentation

For all details about TON testing, Sandbox and Blueprint, see:
https://docs.ton.org/contract-dev/testing/overview