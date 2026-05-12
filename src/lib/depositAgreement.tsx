/**
 * Deposit Agreement — bilingual (EN / ZH) version-stamped T&C presented to a
 * user after their first approved/completed deposit. Bump the version constant
 * (and update the body) whenever terms change so existing signers can be
 * re-prompted.
 *
 * Source: GV CAPITAL CLIENT AGREEMENT (Discretionary Investment Mandate
 * Agreement), document version V2026_01.
 */

import React from "react";

export const CURRENT_DEPOSIT_AGREEMENT_VERSION = "V2026_02";

export const DEPOSIT_AGREEMENT_TITLE = {
    en: "GV Capital Client Agreement",
    zh: "GV Capital 客户协议",
} as const;

export const DEPOSIT_AGREEMENT_SUBTITLE = {
    en: `Discretionary Investment Mandate Agreement — ${CURRENT_DEPOSIT_AGREEMENT_VERSION}`,
    zh: `全权委托投资协议 — ${CURRENT_DEPOSIT_AGREEMENT_VERSION}`,
} as const;

function Section({ number, titleEn, titleZh, lang, children }: {
    number: number;
    titleEn: string;
    titleZh: string;
    lang: "en" | "zh";
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-2">
            <h3 className="text-[13px] sm:text-sm font-black uppercase tracking-wider text-gray-900">
                {number}. {lang === "en" ? titleEn : titleZh}
            </h3>
            <div className="text-[12px] sm:text-[13px] text-gray-700 leading-relaxed space-y-2">
                {children}
            </div>
        </section>
    );
}

function TierTable({ lang }: { lang: "en" | "zh" }) {
    const t = lang === "en"
        ? {
            package: "Package",
            amount: "Investment Amount (USD)",
            lockIn: "Lock-in Period",
            target: "Target Monthly Return",
            bonus: "Additional Bonus",
            risk: "Risk",
            months: "months",
            upTo: "Up to",
            annually: "annually",
        }
        : {
            package: "等级",
            amount: "投资金额 (USD)",
            lockIn: "锁定期",
            target: "目标月度回报",
            bonus: "额外奖励",
            risk: "风险",
            months: "个月",
            upTo: "至多",
            annually: "年度",
        };

    const rows: Array<[string, string, string, string, string]> = [
        [
            t.amount,
            "1 – 2,999",
            "3,000 – 4,999",
            "5,000 – 9,999",
            "≥ 10,000",
        ],
        [
            t.lockIn,
            `6 ${t.months}`,
            `6 ${t.months}`,
            `6 – 12 ${t.months}`,
            `12 ${t.months}`,
        ],
        [
            t.target,
            "3%",
            `${t.upTo} 5%`,
            `${t.upTo} 5%`,
            `${t.upTo} 6%`,
        ],
        [
            t.bonus,
            "—",
            "—",
            `5% ${t.annually}`,
            `6% ${t.annually}`,
        ],
        [
            t.risk,
            "40%",
            "40%",
            "40%",
            "40%",
        ],
    ];

    return (
        <div className="overflow-x-auto -mx-1 my-2">
            <table className="w-full text-[11px] sm:text-[12px] border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-2 text-left font-black text-gray-700 uppercase tracking-wider">{t.package}</th>
                        <th className="border border-gray-300 px-2 py-2 text-center font-black text-gray-700">Silver</th>
                        <th className="border border-gray-300 px-2 py-2 text-center font-black text-gray-700">Gold</th>
                        <th className="border border-gray-300 px-2 py-2 text-center font-black text-gv-gold">Platinum</th>
                        <th className="border border-gray-300 px-2 py-2 text-center font-black text-amber-600">VVIP</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="border border-gray-300 px-2 py-2 font-bold text-gray-600">{row[0]}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center text-gray-800">{row[1]}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center text-gray-800">{row[2]}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center text-gray-800">{row[3]}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center text-gray-800">{row[4]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
    return (
        <ul className="list-disc pl-5 space-y-1">
            {items.map((item, i) => (
                <li key={i}>{item}</li>
            ))}
        </ul>
    );
}

export function DepositAgreementBody({ lang }: { lang: "en" | "zh" }) {
    const en = lang === "en";

    return (
        <div className="space-y-6">
            <Section number={1} titleEn="Introduction" titleZh="引言" lang={lang}>
                <p>
                    {en
                        ? "This Client Agreement (“Agreement”) is entered into between GV Capital (“Company”) and The Client (“Client”)."
                        : "本客户协议（“本协议”）由 GV Capital（以下简称“公司”）与客户（以下简称“客户”）双方签订。"}
                </p>
                <p>
                    {en
                        ? "The Client appoints the Company to manage investment funds on a discretionary basis under the terms set out herein."
                        : "客户同意委托公司根据本协议条款，对其资金进行全权投资管理。"}
                </p>
            </Section>

            <Section number={2} titleEn="Nature of Services" titleZh="服务性质" lang={lang}>
                <p>
                    {en
                        ? "The Company provides discretionary investment management services involving foreign exchange, derivatives, and other financial instruments."
                        : "公司提供包括外汇、衍生品及其他金融工具的全权投资管理服务。"}
                </p>
                <p>{en ? "The Company shall have full discretion to:" : "公司有权全权决定："}</p>
                <Bullets
                    items={en
                        ? ["Enter and exit trades", "Allocate capital", "Manage risk"]
                        : ["交易的进出场", "资金分配", "风险管理"]}
                />
            </Section>

            <Section number={3} titleEn="Investment Tiers" titleZh="投资等级结构" lang={lang}>
                <p>
                    {en
                        ? "The Client may participate under the following investment tiers:"
                        : "客户可选择以下投资等级参与："}
                </p>
                <TierTable lang={lang} />
            </Section>

            <Section number={4} titleEn="Return & Performance Disclosure" titleZh="回报与表现披露" lang={lang}>
                <p>
                    {en
                        ? "All returns stated are targeted or indicative only and are not guaranteed."
                        : "所有回报均为目标或参考值，并不构成保证。"}
                </p>
                <p>{en ? "Investment performance depends on:" : "投资表现取决于："}</p>
                <Bullets
                    items={en
                        ? ["Market conditions", "Trading strategy performance", "Risk exposure"]
                        : ["市场状况", "交易策略表现", "风险水平"]}
                />
                <p>{en ? "The Client acknowledges the possibility of:" : "客户确认可能发生："}</p>
                <Bullets
                    items={en
                        ? ["Partial loss", "Total loss of capital"]
                        : ["部分亏损", "全部本金亏损"]}
                />
            </Section>

            <Section number={5} titleEn="Risk Disclosure" titleZh="风险披露" lang={lang}>
                <p>{en ? "The Client understands that:" : "客户理解："}</p>
                <Bullets
                    items={en
                        ? [
                            "Trading involves high risk",
                            "Leverage may amplify losses",
                            "Market volatility may affect returns",
                        ]
                        : ["交易具有高风险", "杠杆可能放大亏损", "市场波动可能影响回报"]}
                />
                <p className="font-bold text-gray-900">
                    {en ? "The Company does not provide capital protection." : "公司不提供本金保障。"}
                </p>
            </Section>

            <Section number={6} titleEn="Regulatory Status" titleZh="监管状态声明" lang={lang}>
                <p>{en ? "The Client acknowledges that the Company:" : "客户确认："}</p>
                <Bullets
                    items={en
                        ? [
                            "May operate under offshore or non-local regulatory frameworks",
                            "May not be licensed under the laws of the Client’s jurisdiction",
                        ]
                        : ["公司可能在离岸或非本地监管框架下运营", "公司未必在客户所在司法管辖区持有牌照"]}
                />
                <p>
                    {en
                        ? "The Client participates at their own discretion and risk."
                        : "客户自愿承担相关风险参与投资。"}
                </p>
            </Section>

            <Section number={7} titleEn="Lock-in & Withdrawal" titleZh="锁定期与提前提款" lang={lang}>
                <p>
                    {en
                        ? "Funds are subject to a lock-in period as defined by the selected tier."
                        : "资金需遵守所选等级的锁定期限。"}
                </p>
                <Bullets
                    items={en
                        ? [
                            "No withdrawal is permitted during the lock-in period.",
                            <>
                                Early withdrawal may result in forfeiture of a portion of capital:
                                <ul className="list-[circle] pl-5 mt-1">
                                    <li>
                                        <span className="font-bold">40% deduction of principal</span>{" "}
                                        will be applied if funds are withdrawn before the lock-in period ends.
                                    </li>
                                </ul>
                            </>,
                            "Any accrued returns or bonuses will be forfeited upon early withdrawal.",
                        ]
                        : [
                            "锁定期间内不可提款。",
                            <>
                                提前提款可能导致部分本金没收：
                                <ul className="list-[circle] pl-5 mt-1">
                                    <li>
                                        若在锁定期结束前提款，将<span className="font-bold">扣除本金的 40%</span>。
                                    </li>
                                </ul>
                            </>,
                            "提前提款时，所有已产生的收益和奖励将被没收。",
                        ]}
                />
            </Section>

            <Section number={8} titleEn="Fees & Charges" titleZh="费用与收费" lang={lang}>
                <p>{en ? "The Company may impose:" : "公司可能收取："}</p>
                <Bullets
                    items={en
                        ? ["Performance-based fees", "Administrative fees"]
                        : ["绩效费用", "管理费用"]}
                />
                <p>
                    {en
                        ? "All applicable fees will be communicated to the Client."
                        : "所有费用将提前告知客户。"}
                </p>
            </Section>

            <Section number={9} titleEn="Conflict of Interest" titleZh="利益冲突" lang={lang}>
                <p>{en ? "The Company may:" : "公司可能："}</p>
                <Bullets
                    items={en
                        ? [
                            "Act as principal or counterparty",
                            "Engage in transactions that may present conflicts",
                        ]
                        : ["作为交易对手", "存在潜在利益冲突"]}
                />
            </Section>

            <Section number={10} titleEn="Limitation of Liability" titleZh="责任限制" lang={lang}>
                <p>{en ? "The Company shall not be liable for:" : "公司不对以下承担责任："}</p>
                <Bullets
                    items={en
                        ? ["Market losses", "Indirect or consequential damages"]
                        : ["市场亏损", "间接损失"]}
                />
            </Section>

            <Section number={11} titleEn="Termination" titleZh="协议终止" lang={lang}>
                <p>
                    {en
                        ? "Either party may terminate this Agreement subject to:"
                        : "双方可终止协议，前提是："}
                </p>
                <Bullets
                    items={en
                        ? ["Settlement of outstanding obligations"]
                        : ["完成所有未结算事项"]}
                />
            </Section>

            <Section number={12} titleEn="Governing Law" titleZh="适用法律" lang={lang}>
                <p>
                    {en
                        ? "This Agreement shall be governed by the laws of an offshore jurisdiction as determined by the Company."
                        : "本协议受公司指定的离岸司法管辖区法律管辖。"}
                </p>
            </Section>
        </div>
    );
}
