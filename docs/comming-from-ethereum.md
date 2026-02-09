# Coming from Ethereum to TON

This document briefly highlights how TON differs from EVM‑based blockchains and what matters for Ethereum developers.

## Main differences

- TON uses its own **TVM** virtual machine, not EVM, so bytecode, opcodes, and tooling are different.
- TON contracts interact through asynchronous messages; Ethereum contracts call each other synchronously inside one transaction.
- TON has its own languages (Tolk, FunC, Fift, Tact)

## Execution and accounts

- Every TON account can have code, data, and balance; execution is triggered by incoming messages.
- Read‑only get methods are executed off‑chain and cannot be called from other contracts.
- TON wallets are smart contracts that wrap signatures and send internal messages.

## TON vs EVM (short table)

| Aspect           | TON (TVM)                                      | Ethereum (EVM)                        |
|------------------|-----------------------------------------------|---------------------------------------|
| VM               | TVM, own instruction set                     | EVM                                   |
| Execution model  | Asynchronous messages                        | Synchronous call tree                 |
| Accounts         | Any account can have code + balance          | EOAs vs contract accounts             |
| Languages        | Tolk, FunC, Fift, Tact                       | Solidity, Vyper                       |
| Compatibility    | Not EVM‑compatible by default                | Native EVM                            |

## Where to read more

For detailed guidance specifically for Ethereum developers, including TVM vs EVM and ecosystem differences, refer to the “Coming from Ethereum” section on the official TON docs: https://docs.ton.org/from-ethereum
