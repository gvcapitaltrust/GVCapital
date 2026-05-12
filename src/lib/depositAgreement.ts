/**
 * Deposit Agreement — versioned T&C presented to a user after their first
 * approved/completed deposit. Bump the version (and update both EN/ZH bodies)
 * whenever terms change so existing signers can be re-prompted.
 */

export const CURRENT_DEPOSIT_AGREEMENT_VERSION = "V.2026.05";

export const DEPOSIT_AGREEMENT_TITLE = {
    en: "Deposit & Capital Commitment Agreement",
    zh: "存款与资本承诺协议",
} as const;

export const DEPOSIT_AGREEMENT_SUBTITLE = {
    en: `Version ${CURRENT_DEPOSIT_AGREEMENT_VERSION} — Required acknowledgement following your first capital contribution.`,
    zh: `版本 ${CURRENT_DEPOSIT_AGREEMENT_VERSION} — 首次入金后必须确认的条款。`,
} as const;

export const DEPOSIT_AGREEMENT_BODY_EN = `
GV CAPITAL TRUST
DEPOSIT & CAPITAL COMMITMENT AGREEMENT (${CURRENT_DEPOSIT_AGREEMENT_VERSION})

This Deposit & Capital Commitment Agreement ("Deposit Agreement") supplements the Master Private Wealth & Investment Agreement previously acknowledged at account registration. By signing below, The Client ("you") confirms understanding and unconditional acceptance of the terms applicable to all capital you have placed, and will place, with GV Capital Trust ("The Trust").

1. CAPITAL LOCK-IN
All deposits are subject to a mandatory capital lock-in period from the date of deposit clearance:
   (a) Silver, Gold, and Platinum Tiers — 6 (six) months.
   (b) VVIP Tier — 12 (twelve) months.
You acknowledge that the lock-in period restarts for each individual deposit and is calculated on a per-deposit basis, not on aggregate balance.

2. EARLY WITHDRAWAL PENALTY
Any emergency premature withdrawal of principal capital submitted prior to the completion of the applicable lock-in period will incur an automatic forty percent (40%) liquidation penalty against the principal amount being withdrawn. Profits, dividends, and bonus distributions are excluded from this penalty and remain freely withdrawable, subject to standard processing windows.

3. DIVIDEND BENCHMARKS
The Trust targets monthly dividend benchmarks corresponding to your active tier. These benchmarks are speculative targets driven by active trading algorithms and historical performance. The Trust does not legally guarantee absolute, fixed-rate yields against global market volatility. Past performance is strictly not indicative of future results.

4. NON-REFUNDABLE NATURE OF DEPOSITS
Cleared deposits, once credited to your account, are not refundable as deposits. Recovery of capital must follow the withdrawal protocols defined herein and in the Master Private Wealth & Investment Agreement, and is subject to the lock-in and penalty terms above.

5. SOURCE OF FUNDS & AML
You re-affirm that all capital deposited derives from legitimate sources and complies with international Anti-Money Laundering (AML) and Counter-Financing of Terrorism (CFT) regulations. The Trust reserves the right to suspend, freeze, or refund any deposit pending source-of-funds verification.

6. PROCESSING WINDOWS
Deposit clearance is targeted within 24 hours of receipt evidence submission. Withdrawal requests are processed within 3 working days from authorization. Processing windows are best-effort and may be extended where compliance, banking, or blockchain verification requires additional time.

7. ELECTRONIC SIGNATURE
You acknowledge that typing your full legal name in the signature field, in conjunction with ticking the agreement checkbox, constitutes a valid electronic signature under the Electronic Commerce Act 2006 (Malaysia) and equivalent international statutes. Your signature, the timestamp, your IP address, and your user-agent are recorded as an immutable audit record.

By signing below, you confirm that you have read, understood, and unconditionally accepted all terms set out in this Deposit Agreement.
`.trim();

export const DEPOSIT_AGREEMENT_BODY_ZH = `
GV 资本信托
存款与资本承诺协议 (${CURRENT_DEPOSIT_AGREEMENT_VERSION})

本《存款与资本承诺协议》（“存款协议”）系对客户在账户注册时已确认之《主私人财富与投资协议》的补充。客户（“您”）通过下方签署，确认理解并无条件接受适用于您已存入及将存入 GV 资本信托（“信托”）的全部资本之相关条款。

1. 资本锁定期
所有入金自清算之日起，受到强制性的资本锁定期限制：
   (a) Silver、Gold 及 Platinum 等级 — 6 (六) 个月。
   (b) VVIP 等级 — 12 (十二) 个月。
您了解，锁定期按每笔入金独立计算，并自该笔入金之清算日起重新计时，并非以账户总额合并计算。

2. 提前提款违约金
若在相应锁定期完成前提交本金紧急提前提款申请，将对所提取本金自动扣除百分之四十（40%）的清算违约金。利润、派息分红及奖金分配不受此违约金限制，仍可在标准处理时限内自由提款。

3. 派息基准
信托以各等级对应的月度派息为目标基准。该等基准系基于主动交易算法及历史表现的预期目标。面临全球市场波动时，信托不构成对绝对固定收益的法律保证。过往表现不代表未来结果。

4. 入金不可退还性
已清算并贷记至您账户之入金，不得以入金方式退还。资本之取回须依本协议及《主私人财富与投资协议》所定之提款协议办理，并受上述锁定期与违约金条款限制。

5. 资金来源与反洗钱
您重申，所有入金资金均来源合法，符合国际反洗钱（AML）及反恐怖融资（CFT）法规。信托保留在等待资金来源核查期间暂停、冻结或退还任何入金之权利。

6. 处理时限
入金清算之目标处理时限为提交转账凭证后 24 小时内。提款申请自授权后 3 个工作日内处理。所列处理时限均为尽力而为之目标，若合规、银行或区块链核查需额外时间，得予延长。

7. 电子签名
您确认，于签名栏键入您的法定全名并勾选同意框，构成马来西亚《2006 年电子商务法》及相关国际法规下之有效电子签名。您的签名、时间戳记、IP 地址及用户代理将作为不可篡改之审计记录予以保存。

通过下方签署，您确认已阅读、理解并无条件接受本《存款协议》之全部条款。
`.trim();

export const DEPOSIT_AGREEMENT_BODY = {
    en: DEPOSIT_AGREEMENT_BODY_EN,
    zh: DEPOSIT_AGREEMENT_BODY_ZH,
} as const;
