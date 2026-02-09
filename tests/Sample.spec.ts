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
