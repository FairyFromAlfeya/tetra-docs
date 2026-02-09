# Testing and debugging Tetra Smart Contracts with Tycho Executor

Short guide on how to test and debug Tetra smart contracts using `@ton/sandbox` with a custom `TychoExecutor` and on‑chain network config.

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

## 3. Simple contract and test

```func
#include "imports/stdlib.fc";

const op::increase = "op::increase"c; ;; create an opcode from string using the "c" prefix, this results in 0x7e8764ef opcode in this case

;; storage variables

;; id is required to be able to create different instances of counters
;; since addresses in TVM depend on the initial state of the contract
global int ctx_id;
global int ctx_counter;

;; load_data populates storage variables using stored data
() load_data() impure {
  var ds = get_data().begin_parse();

  ctx_id = ds~load_uint(32);
  ctx_counter = ds~load_uint(32);

  ds.end_parse();
}

;; save_data stores storage variables as a cell into persistent storage
() save_data() impure {
  set_data(
    begin_cell()
      .store_uint(ctx_id, 32)
      .store_uint(ctx_counter, 32)
      .end_cell()
  );
}

;; recv_internal is the main function of the contract and is called when it receives a message from other contracts
() recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
  if (in_msg_body.slice_empty?()) { ;; ignore all empty messages
    return ();
  }

  slice cs = in_msg_full.begin_parse();
  int flags = cs~load_uint(4);
  if (flags & 1) { ;; ignore all bounced messages
    return ();
  }

  load_data(); ;; here we populate the storage variables

  int op = in_msg_body~load_uint(32); ;; by convention, the first 32 bits of incoming message is the op
  int query_id = in_msg_body~load_uint(64); ;; also by convention, the next 64 bits contain the "query id", although this is not always the case

  if (op == op::increase) {
    int increase_by = in_msg_body~load_uint(32);
    ctx_counter += increase_by;
    save_data();
    return ();
  }

  throw(0xffff); ;; if the message contains an op that is not known to this contract, we throw
}

;; get methods are a means to conveniently read contract data using, for example, HTTP APIs
;; they are marked with method_id
;; note that unlike in many other smart contract VMs, get methods cannot be called by other contracts

int get_counter() method_id {
  load_data();
  return ctx_counter;
}

int get_id() method_id {
  load_data();
  return ctx_id;
}
```

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


## 5. Full testing documentation

For all details about testing, Sandbox and Blueprint, see:
https://docs.ton.org/contract-dev/testing/overview