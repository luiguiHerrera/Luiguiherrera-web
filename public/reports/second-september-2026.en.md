# The index holds up, but the market narrows

The Fed raised rates again and the ten-year Treasury exceeded 5%. The S&P 500 held up, but participation beneath the index deteriorated: fewer sectors advanced, fewer remained above long-term averages and leadership concentrated in technology again.

- Edition: Second report of September 2026
- Author: Luigui Herrera
- Original publication: 2026-09-21
- Last editorial update: 2026-09-21
- Editorial cutoff: 2026-09-21
- Market data cutoff: 2026-09-18
- English edition: https://www.luiguiherrera.com/en/reports/second-september-2026
- Spanish original: https://www.luiguiherrera.com/informes/segundo-informe-septiembre-2026
- Prospective period: From September 21, 2026 until the next report publication.

## General context

In the [First Report](/en/reports/first-september-2026), high long-term yields were the risk equities needed to absorb. Now we have events: the [Fed](https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm) raised rates by 25 basis points on September 16 to 3.75–4.00%, and the ten-year Treasury exceeded 5%. Yields increased financing costs; the equity adjustment appeared mainly beneath the index. [B1–B2]

Positive sectors fell from 4/11 to 2/11 and those above their 200-session moving average (MA200) from 8/11 to 4/11. Breadth—the extent of market participation—lost support. Exchange-traded funds (ETFs) allow comparisons among large companies, small companies and technology. The table compares homogeneous five-session, six-close windows; it does not measure cumulative returns between cutoffs. [[C1]](/en/dashboard)

September’s BofA FMS, surveyed September 4–10, ranks a disorderly yield rise as the main tail risk, ahead of AI. Compared with August’s framework, equity exposure moderates and cash increases slightly. This is managers’ perception rather than a prediction of the next move. [A1]

Two table terms: contango means farther-dated futures trade above nearer contracts; Midterm identifies US midterm-election years. Neither determines market direction.

The index changed little; internal market quality deteriorated.

## Market readings at the close

Market conditions at the September 18, 2026 close

Frozen data: September 18 sectors and radar retrieved on September 21, with exact radar replay using the eleven [Alpha Vantage](https://www.alphavantage.co/documentation/#daily) ETFs. Relative breadth and MA200 use the same [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) / [Yahoo](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) authority at both cutoffs. Spot VIX retains its September 17 date. BTC flows: [Farside](https://farside.co.uk/bitcoin-etf-flow-all-data/), five complete sessions. The V1 classification is presented as a bounded replay conditional on reconciled sectors and VIX, rather than an exact engine snapshot. No point score or confidence figure is published.

This edition’s cutoff: **2026-09-18**. Each module retains its source’s latest available date.

### What changed since the [First Report](/en/reports/first-september-2026)

| Metric | 04/09 | 18/09 |
| --- | --- | --- |
| Positive sectors | 4/11 | 2/11 |
| Sectors above MA200 | 8/11 | 4/11 |
| RSP vs SPY | -0.88 pp | -1.11 pp |
| IWM vs SPY | -0.02 pp | -1.31 pp |
| QQQ vs SPY | +0.24 pp | +1.01 pp |
| Sector dispersion | +4.16 pp | +4.88 pp |
| Fragility | 20/100 Low | 20/100 Low |
| 21D average correlation | 0.145 | 0.199 |
| EWMA vol. | 7.39 % | 7.92 % |
| GARCH vol. | 7.67 % | 8.23 % |

The index changed little; internal market quality deteriorated.

SPY fell 0.86% between the two adjusted closes. Participation narrowed: fewer sectors advance, fewer remain above MA200 and QQQ gains a relative advantage. The radar reproduces a moderate volatility increase, with fragility still low. BTC flows improved late in the week, but the five-session total is nearly balanced. The V1 regime is not compared without exact historical reproduction.

Breadth normalized to five sessions at each cutoff: August 28–September 4 and September 11–18, using six adjusted closes from the same [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) / [Yahoo](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) baseline, published to two decimals. September 4 is recalculated only for this table; the [First Report](/en/reports/first-september-2026) retains its original window. Positive sectors and dispersion use the same eleven [Alpha Vantage](https://www.alphavantage.co/documentation/#daily) ETFs, unadjusted closes and five sessions; dispersion is in percentage points. MA200 uses the same eleven ETFs and the adjusted [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) series. EWMA, GARCH, correlation and fragility are reproduced with the same engine and frozen sector series at both cutoffs; they do not come from [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html).

### V1 regime on September 18

**Selective risk-on**

| Field | Value |
| --- | --- |
| Bias | Favorable |
| Reconstructed score | 70–77 / 100 |
| Confidence | No point figure is published |

The classification is reconstructed with the V1 code deployed at cutoff. The sector and VIX pillars are reproducible; the exact BTC pillar cache was not preserved. Every admissible state of that pillar produces the same classification: Selective risk-on.

**View methodology:** Replay conditional on keeping fixed the September 18 sector observations and September 17 VIX retrieved on September 21. Their exact admission into the historical cache was not established either. Code from commit 4ee6adb006f360fea13837db5f7d45815f297b55 is run across 6,049 cases, a conservative set covering all BTC score branches: availability, source, severity and streak. Sectors and VIX contribute 66.3 points; BTC contributes between 3.6 and 11.1. Engine rounding produces 70–77, and all cases retain Selective risk-on. This range describes model states rather than a confidence interval. No point score or confidence is chosen, and the exact cutoff cache state is not claimed to have been recovered.

[Bounded replay · code and evidence [C5]](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-regimen.html)

#### What helped

- Healthcare and technology lead the sector window; QQQ gains +1.01 pp against SPY over five sessions.
- Spot VIX: 15.44, latest available observation September 17.
- [Farside](https://farside.co.uk/bitcoin-etf-flow-all-data/): two consecutive inflow sessions; five-session total +6.1 M USD.

#### What weighed

- Only 2/11 sectors positive and 4/11 above MA200.
- RSP/SPY −1.11 pp and IWM/SPY −1.31 pp; sector dispersion 4.88 pp.
- The VX curve moves from strong to moderate contango.

#### What to watch

- Check whether technology leadership broadens back into the rest of the market.
- Assess whether BTC inflows continue beyond the last two sessions.

### Sector rotation

- Positive sectors: **2 / 11**
- Negative sectors: **9**
- 1W dispersion: **+4.9 pp**
- Reading at publication: the reading suggests growth rotation. It does not imply a future market direction.

| Group | Ticker | Name | 1W return |
| --- | --- | --- | ---: |
| Leader | XLV | Health care | +1.8% |
| Leader | XLK | Technology | +1.0% |
| Laggard | XLU | Utilities | -3.0% |
| Laggard | XLF | Financials | -2.4% |
| Laggard | XLRE | Real Estate | -2.0% |

### Relative breadth at cutoff

- RSP/SPY 5 sessions · September 11–18: **-1.1 pp**
- IWM/SPY 5 sessions · September 11–18: **-1.3 pp**
- QQQ/SPY 5 sessions · September 11–18: **+1.0 pp**
- Sectors above their long-term average: **4 / 11**
- Reading at publication: simple adjusted ETF returns minus SPY over five sessions; published closes from the same [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) / [Yahoo](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) baseline. MA200 uses that authority’s eleven sector ETFs. This is not the cumulative return between reports.

### Quantitative radar at cutoff

- Fragility: **20/100 · Low**
- EWMA volatility: **+7.9%**
- GARCH volatility: **+8.2%**
- Average correlation: **0.20**
- Sector dispersion: **+4.9 pp**

### VIX — volatility at cutoff

| Field | Value |
| --- | --- |
| Spot VIX date | 2026-09-17 |
| Level at cutoff | 15.4 |
| 1D change | -2.3 |
| Percentile | 34.9 |
| Status | Low normal / Low normal |
| Momentum | Falling |
| Curve | Moderate contango |
| Historical reading | Longer-dated contracts trade above the nearest expiry. This structure is common in more orderly volatility environments. |

### VIX term structure at cutoff

- Classification: **Moderate contango**
- VX2 - VX1: **+0.66 points**
- VX1-VX2 slope: **+3.7%**
- VX3 - VX1: **+1.08 points**
- VX1 · 2026-10-21: 18.0411
- VX2 · 2026-11-18: 18.7049
- VX3 · 2026-12-16: 19.125
- VX4 · 2027-01-20: 19.8901
- VX5 · 2027-02-17: 20.3
- VX6 · 2027-03-17: 20.475
- VX7 · 2027-04-21: 20.775
- VX8 · 2027-05-18: 20.9396

### BTC ETF net flows at cutoff

- Latest day: **+433 M USD**
- Rolling 5D: **+6 M USD**
- Streak: **2-day inflow streak**
- Reading at publication: flows improved sharply late in the week; two consecutive inflow sessions brought the five-day total to approximately +6 M USD (exactly +6.1 M). The recovery is visible, but the full window remains almost balanced and has not reproduced early September’s accumulation.

### Historical GLD flow-pressure proxy

- Data date: **2026-09-18**
- Proxy at cutoff: **Likely net inflow**
- 1D change in shares outstanding: **+0.41%**
- 5D change in shares outstanding: **+0.93%**
- 20D change in shares outstanding: **+1.79%**
- Summary: GLD shows likely net inflow over 5 sessions, using changes in shares outstanding as a flow-pressure proxy.
- Source limitation: my calculation using daily NAV, shares outstanding and net-asset data published by [State Street](https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx). It does not represent official fund-reported flows.


## Reading by asset

### S&P 500

**The index holds up with less of the market behind it**

Classification: **bonds, earnings and breadth**

- **What happened:** SPY closed at USD 761.69. Between the two windows, RSP’s disadvantage versus SPY increased from −0.88 to −1.11 percentage points; IWM’s from −0.02 to −1.31. QQQ widened its advantage from +0.24 to +1.01. RSP gives companies equal weight; IWM tracks small businesses. The contrast shows where participation is lacking. MA200 counts refer to sectors rather than the percentage of all 500 companies. [[C1]](/en/dashboard)
- **What changed:** [AAII](https://www.aaii.com/sentimentsurvey) offers another contrast: in the week ended September 16, 53.3% of respondents were bearish, 28.8% bullish and 17.9% neutral. Individual-investor pessimism is greater than the index suggests; that alone does not establish a buy signal. [[B3]](https://www.aaii.com/sentimentsurvey)
- **What I expect:** [Detrick](https://www.carsongroup.com/insights/blog/a-dove-in-hawks-clothing/) retained a constructive view after the [Fed](https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm) September 16 increase. That is an external opinion; here confirmation requires RSP and IWM to stop lagging, and MOVE, Treasury-bond implied volatility, to avoid signaling a disorderly adjustment. [[B20]](https://www.carsongroup.com/insights/blog/a-dove-in-hawks-clothing/)

#### [Goldman](https://www.goldmansachs.com/insights/articles/s-and-p-500-forecast-to-climb-as-earnings-growth-powers-stocks-higher): earnings before multiples

Two primary [Goldman Sachs Research](https://www.goldmansachs.com/insights/articles/s-and-p-500-forecast-to-climb-as-earnings-growth-powers-stocks-higher) references, with different dates. May forecasts are not presented as a September revision. [B13, B18]

| May 28, 2026 reference | [Goldman](https://www.goldmansachs.com/insights/articles/s-and-p-500-forecast-to-climb-as-earnings-growth-powers-stocks-higher) forecast |
| --- | --- |
| S&P 500 · end of 2026 | 8,000 points |
| Earnings per share (EPS) · 2026 | 340 USD |
| Earnings per share (EPS) · 2027 | 385 USD |

In May, [Goldman](https://www.goldmansachs.com/insights/articles/s-and-p-500-forecast-to-climb-as-earnings-growth-powers-stocks-higher) attributed the rally to earnings rather than rising valuation, and connected approximately half of 2026 earnings growth to AI infrastructure suppliers and beneficiaries. These are external forecasts rather than this report’s targets. [[B13]](https://www.goldmansachs.com/insights/articles/s-and-p-500-forecast-to-climb-as-earnings-growth-powers-stocks-higher)

On September 15, [Goldman](https://www.goldmansachs.com/insights/articles/can-the-s-and-p-500-rally-as-treasury-yields-rise) documented that the forward P/E—price relative to expected twelve-month earnings—had fallen from around 22 to 19 times in 2026. Relative valuation against bonds remained roughly stable. Fixed-rate debt and long maturities cushion the immediate rate impact on large companies; stronger growth can offset some valuation pressure. [[B18]](https://www.goldmansachs.com/insights/articles/can-the-s-and-p-500-rally-as-treasury-yields-rise)

The reading requires earnings to materialize: balance-sheet protection buys time rather than eliminates risk. In addition, the S&P is capitalization-weighted; it does not replicate the average household or business. Consumption still matters even though its economic weight differs from its stock-market weight. [[B14]](https://www.spglobal.com/spdji/en/methodology/article/sp-us-indices-methodology/)

#### Statistical levels

SPY · Weekly · Opening 2026-09-14 · Price at the 2026-09-18 close: 761.69 USD. 1755 completed historical periods.

| Reference | Price (USD) | Distance from price to level |
| --- | --- | --- |
| Period opening | 759.00 | — |
| Current snapshot price | 761.69 | — |
| WSLE | 731.64 | +4.11 % |
| WALE | 746.28 | +2.06 % |
| WAHE | 770.92 | -1.20 % |
| WSHE | 782.47 | -2.66 % |

Historical extensions from the period opening. They imply neither support, resistance nor future direction.

[Yahoo Finance](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) · persisted [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) authority. The provider’s adjusted regular close, frozen in the authority. Distance = price / level − 1. The cutoff week is excluded from the estimation sample.

#### September seasonality

September · Midterm · All · N = 8. Years: 2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994.

| Week | Average return | Win rate | Actual N |
| --- | --- | --- | --- |
| Week 1 | -0.89 % | 37.5 % | 8 |
| Week 2 | +0.81 % | 50.0 % | 8 |
| Week 3 | -0.45 % | 75.0 % | 8 |
| Week 4 | -0.86 % | 25.0 % | 8 |
| Week 5 | -0.25 % | 66.7 % | 3 |

Average monthly return: -0.63 %. Monthly win rate: 50.0 %. Average weekly win rate: 50.8 %. Strongest week: 2; weakest: 1. Average weekly N: 7.0.

Returns between adjusted weekly closes. Weeks are assigned by closing date: Week 1 = days 1–7; Week 5 = days 29–31. Only completed Midterm-year Septembers before 2026; up to 10 cycles. N can vary by week. The first week may include days in August.

Seasonality provides historical context. It does not imply that the pattern will repeat.

#### My comparison: September, October and November in Midterm years

SPY · All · eight complete Midterm cycles before 2026. My calculations; win rate means the share of positive months.

| Month | Average return | Win rate | Actual N |
| --- | --- | --- | --- |
| September | -0.63 % | 50.0 % | 8 |
| October | +3.72 % | 87.5 % | 8 |
| November | +2.49 % | 75.0 % | 8 |

On August 31, [Detrick](https://www.carsongroup.com/insights/blog/why-the-worst-month-of-the-year-likely-wont-bring-rain/) noted September’s historical weakness but considered that 2026 could diverge from it. That opinion does not replace our samples: October and November are calculated in-house from [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html), rather than [Carson](https://www.carsongroup.com/insights/blog/why-the-worst-month-of-the-year-likely-wont-bring-rain/) figures. [[B19]](https://www.carsongroup.com/insights/blog/why-the-worst-month-of-the-year-likely-wont-bring-rain/)

Seasonality provides historical context. It does not imply that the pattern will repeat.

### Gold

**Persistent demand, prices at a high extension**

Classification: **ETFs, the dollar and real yields**

- **What happened:** GLD closed at USD 401.17, above WAHE (398.23) and near WSHE (404.19): a high statistical extension from the weekly opening. Shares outstanding rose approximately 0.93% over five sessions. This indirect demand indicator does not equal official monetary inflows. [C1–C2]
- **What changed:** The [World Gold Council](https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows/2026/09) provides a different scale: August added $18 billion and 121 tonnes to global gold ETFs, bringing holdings to a record 4,189 tonnes. Demand persisted during corrections. These are monthly data through August 31; they are not added to GLD’s weekly change. [[B4]](https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows/2026/09)
- **What I expect:** The next test is whether holdings withstand a correction with a firm dollar and high real yields, meaning yields after inflation. Persistent fund selling would weaken the demand reading; stable positions would support it.

#### Statistical levels

GLD · Weekly · Opening 2026-09-14 · Price at the 2026-09-18 close: 401.17 USD. 1139 completed historical periods.

| Reference | Price (USD) | Distance from price to level |
| --- | --- | --- |
| Period opening | 391.89 | — |
| Current snapshot price | 401.17 | — |
| WSLE | 378.65 | +5.95 % |
| WALE | 385.61 | +4.04 % |
| WAHE | 398.23 | +0.74 % |
| WSHE | 404.19 | -0.75 % |

Historical extensions from the period opening. They imply neither support, resistance nor future direction.

[Yahoo Finance](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) · persisted [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) authority. The provider’s adjusted regular close, frozen in the authority. Distance = price / level − 1. The cutoff week is excluded from the estimation sample.

#### September seasonality

September · Midterm · All · N = 5. Years: 2022, 2018, 2014, 2010, 2006.

| Week | Average return | Win rate | Actual N |
| --- | --- | --- | --- |
| Week 1 | -0.39 % | 40.0 % | 5 |
| Week 2 | -1.07 % | 20.0 % | 5 |
| Week 3 | -1.24 % | 40.0 % | 5 |
| Week 4 | +0.23 % | 40.0 % | 5 |
| Week 5 | +1.37 % | 100.0 % | 2 |

Average monthly return: -1.90 %. Monthly win rate: 20.0 %. Average weekly win rate: 48.0 %. Strongest week: 5; weakest: 3. Average weekly N: 4.4.

Returns between adjusted weekly closes. Weeks are assigned by closing date: Week 1 = days 1–7; Week 5 = days 29–31. Only completed Midterm-year Septembers before 2026; up to 10 cycles. N can vary by week. The first week may include days in August.

Seasonality provides historical context. It does not imply that the pattern will repeat.

### China

**Cheap valuations still need confirmation**

Classification: **domestic wealth and consumption**

- **What happened:** FXI closed at USD 34.32. The [First Report](/en/reports/first-september-2026) thesis remains open: the valuation discount needs to translate into domestic demand. The [BIS](https://fred.stlouisfed.org/series/QCNR628BIS) series published by [FRED](https://fred.stlouisfed.org/series/VIXCLS) puts real residential prices at 85.13 in the first quarter of 2026, versus 91.61 a year earlier (2010=100). This is a quarterly reference for property weakness rather than a September observation. [[B5]](https://fred.stlouisfed.org/series/QCNR628BIS)
- **What changed:** Housing adds a concrete constraint to the valuation thesis: falling prices can weaken perceived wealth and encourage households to postpone spending. That domestic transmission deserves more attention than possible global rotation toward Asia.
- **What I expect:** The useful signal would be property stabilization alongside higher household spending. An isolated FXI rebound would not resolve that test.

#### Statistical levels

FXI · Weekly · Opening 2026-09-14 · Price at the 2026-09-18 close: 34.32 USD. 1145 completed historical periods.

| Reference | Price (USD) | Distance from price to level |
| --- | --- | --- |
| Period opening | 34.68 | — |
| Current snapshot price | 34.32 | — |
| WSLE | 32.77 | +4.73 % |
| WALE | 33.78 | +1.60 % |
| WAHE | 35.52 | -3.38 % |
| WSHE | 36.41 | -5.74 % |

Historical extensions from the period opening. They imply neither support, resistance nor future direction.

[Yahoo Finance](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) · persisted [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) authority. The provider’s adjusted regular close, frozen in the authority. Distance = price / level − 1. The cutoff week is excluded from the estimation sample.

#### September seasonality

September · Midterm · All · N = 5. Years: 2022, 2018, 2014, 2010, 2006.

| Week | Average return | Win rate | Actual N |
| --- | --- | --- | --- |
| Week 1 | +0.28 % | 60.0 % | 5 |
| Week 2 | -0.79 % | 40.0 % | 5 |
| Week 3 | +0.11 % | 60.0 % | 5 |
| Week 4 | -0.75 % | 40.0 % | 5 |
| Week 5 | -1.01 % | 50.0 % | 2 |

Average monthly return: -1.43 %. Monthly win rate: 60.0 %. Average weekly win rate: 50.0 %. Strongest week: 1; weakest: 5. Average weekly N: 4.4.

Returns between adjusted weekly closes. Weeks are assigned by closing date: Week 1 = days 1–7; Week 5 = days 29–31. Only completed Midterm-year Septembers before 2026; up to 10 cycles. N can vary by week. The first week may include days in August.

Seasonality provides historical context. It does not imply that the pattern will repeat.

### Japan

**The [BOJ](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf) confirms another normalization step**

Classification: **decision, yen and JGBs**

- **What happened:** On September 18, the Bank of Japan decided to raise the money-market rate to around 1.25% from 1.00%, effective September 24. The 25-basis-point increase passed seven votes to two. EWJ closed September 18 at USD 97.00. The meeting is now an event; implementation of the new rate is after the market cutoff. [[B6]](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf)
- **What changed:** The question is no longer what the [BOJ](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf) will decide, but how JGBs—Japanese government bonds—and the yen will absorb implementation. Refinanced debt and conversion of overseas earnings are two channels to watch; no unverified market reaction is attributed here.
- **What I expect:** After September 24, separate local-equity responses from their dollar conversion in EWJ. Simultaneous bond and currency dislocation would require reviewing the reading even if the ETF alone appeared stable.

#### Statistical levels

EWJ · Weekly · Opening 2026-09-14 · Price at the 2026-09-18 close: 97.00 USD. 1591 completed historical periods.

| Reference | Price (USD) | Distance from price to level |
| --- | --- | --- |
| Period opening | 97.37 | — |
| Current snapshot price | 97.00 | — |
| WSLE | 93.60 | +3.63 % |
| WALE | 95.54 | +1.53 % |
| WAHE | 99.13 | -2.15 % |
| WSHE | 100.94 | -3.90 % |

Historical extensions from the period opening. They imply neither support, resistance nor future direction.

[Yahoo Finance](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) · persisted [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) authority. The provider’s adjusted regular close, frozen in the authority. Distance = price / level − 1. The cutoff week is excluded from the estimation sample.

#### September seasonality

September · Midterm · All · N = 7. Years: 2022, 2018, 2014, 2010, 2006, 2002, 1998.

| Week | Average return | Win rate | Actual N |
| --- | --- | --- | --- |
| Week 1 | +0.20 % | 57.1 % | 7 |
| Week 2 | +0.41 % | 57.1 % | 7 |
| Week 3 | -0.26 % | 42.9 % | 7 |
| Week 4 | -0.81 % | 42.9 % | 7 |
| Week 5 | +0.10 % | 50.0 % | 2 |

Average monthly return: -0.86 %. Monthly win rate: 42.9 %. Average weekly win rate: 50.0 %. Strongest week: 2; weakest: 4. Average weekly N: 6.0.

Returns between adjusted weekly closes. Weeks are assigned by closing date: Week 1 = days 1–7; Week 5 = days 29–31. Only completed Midterm-year Septembers before 2026; up to 10 cycles. N can vary by week. The first week may include days in August.

Seasonality provides historical context. It does not imply that the pattern will repeat.

### Bitcoin

**Price, flows and the calendar tell different stories**

Classification: **three short-term lenses**

- **What happened:** Price: Bitcoin closed the September 18 UTC day at USD 80,901.46, near WAHE (82,260.60). The close sits near the upper part of the average weekly range; proximity does not turn the extension into resistance or guarantee continuation. [[C2]](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html)
- **What changed:** Flows: [Farside](https://farside.co.uk/bitcoin-etf-flow-all-data/) records +$6.1 million from September 14–18, versus +$986.7 million over the [First Report](/en/reports/first-september-2026) five sessions. Thursday and Friday brought the balance back to barely positive. The late improvement does not reproduce early-month accumulation. [[B7]](https://farside.co.uk/bitcoin-etf-flow-all-data/)
- **What I expect:** Seasonality: the Midterm and 2020–2025 tables use different samples. October provides a favorable precedent, but six observations do not establish a robust pattern. The [River](https://river.com/content/the-case-for-a-10-bitcoin-allocation) reference uses years rather than weeks and does not justify a tactical price reading.

#### Statistical levels

BTCUSD · Weekly · Opening 2026-09-14 · Price at the 2026-09-18 close: 80901.46 USD. 626 completed historical periods.

| Reference | Price (USD) | Distance from price to level |
| --- | --- | --- |
| Period opening | 76830.28 | — |
| Current snapshot price | 80901.46 | — |
| WSLE | 64314.56 | +25.79 % |
| WALE | 71582.64 | +13.02 % |
| WAHE | 82260.60 | -1.65 % |
| WSHE | 88196.88 | -8.27 % |

Historical extensions from the period opening. They imply neither support, resistance nor future direction.

[Yahoo Finance](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) · persisted [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) authority. September 18, 2026 daily UTC close; Monday-to-Sunday week, still incomplete at cutoff. Distance = price / level − 1. The cutoff week is excluded from the estimation sample.

#### September seasonality

September · Midterm · All · N = 2. Years: 2022, 2018.

| Week | Average return | Win rate | Actual N |
| --- | --- | --- | --- |
| Week 1 | +5.16 % | 100.0 % | 2 |
| Week 2 | -2.22 % | 50.0 % | 2 |
| Week 3 | -3.68 % | 50.0 % | 2 |
| Week 4 | -0.11 % | 50.0 % | 2 |
| Week 5 | -1.27 % | 0.0 % | 1 |

Average monthly return: -4.47 %. Monthly win rate: 0.0 %. Average weekly win rate: 50.0 %. Strongest week: 1; weakest: 3. Average weekly N: 1.8.

Returns between adjusted weekly closes. Weeks are assigned by closing date: Week 1 = days 1–7; Week 5 = days 29–31. Only completed Midterm-year Septembers before 2026; up to 10 cycles. N can vary by week. The first week may include days in August.

Seasonality provides historical context. It does not imply that the pattern will repeat.

#### Bitcoin: a second 2020–2025 lens

Separate from Midterm · six complete years, excluding 2026.

| Month | Average return | Positive months | Actual N |
| --- | --- | --- | --- |
| September | -0.19 % | 3 / 6 | 6 |
| October | +18.13 % | 5 / 6 | 6 |

Since 2020, October has been especially strong in this sample. September, by contrast, has been almost neutral on average. The more recent pattern stands out: September was positive in 2023, 2024 and 2025, and 2026 was positive again at cutoff.

A second lens independent of Midterm: 2020–2025, six observations per month. Complete monthly returns from the authority, published to four decimals; approximate averages. The existing monthly aggregator is reused. The sample excludes 2026.

September 2026 through September 18: 3.00%, an incomplete month excluded from the averages.

Seasonality provides historical context. It does not imply that the pattern will repeat.

#### Bitcoin · long-term structural reference

[River](https://river.com/content/the-case-for-a-10-bitcoin-allocation) · [Sam Baker](https://river.com/content/the-case-for-a-10-bitcoin-allocation) · September 2, 2026. A horizon of years; this does not validate tactical entries or weekly flows. [[B15]](https://river.com/content/the-case-for-a-10-bitcoin-allocation)

| [River](https://river.com/content/the-case-for-a-10-bitcoin-allocation) horizon | Scenario range |
| --- | --- |
| Next 3–5 years (2029–2031) | USD 250,000–840,000 per BTC |

[River](https://river.com/content/the-case-for-a-10-bitcoin-allocation) assumes cumulative inflows of $1.3–5.3 trillion and that every dollar of inflow adds three dollars to market capitalization. The range depends on those assumptions and on historical relationships continuing; it is neither a confidence interval, my own prediction nor a single target date in 2031.

### Ethereum

**Is the rally broadening beyond Bitcoin?**

Classification: **recovery without sustained confirmation**

- **What happened:** Ethereum closed at USD 2,611.35, near WAHE (2,691.48). Its dollar rebound needs comparison with BTC to determine whether crypto participation extends beyond its main asset. [[C2]](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html)
- **What changed:** ETH/BTC gained 4.71% between September 4 and September 18, but lost 0.94% in the last week. The table’s homogeneous UTC closes show a recovery between cutoffs that is not yet sustained. [C4]
- **What I expect:** The test is consecutive relative strength in ETH/BTC with sufficient liquidity. If the ratio falls again while ETH rises in dollars, the rebound would not confirm a broader rally.

#### Statistical levels

ETHUSD · Weekly · Opening 2026-09-14 · Price at the 2026-09-18 close: 2611.35 USD. 462 completed historical periods.

| Reference | Price (USD) | Distance from price to level |
| --- | --- | --- |
| Period opening | 2476.60 | — |
| Current snapshot price | 2611.35 | — |
| WSLE | 1911.61 | +36.60 % |
| WALE | 2232.44 | +16.97 % |
| WAHE | 2691.48 | -2.98 % |
| WSHE | 2919.69 | -10.56 % |

Historical extensions from the period opening. They imply neither support, resistance nor future direction.

[Yahoo Finance](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) · persisted [Statistical Levels](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) authority. September 18, 2026 daily UTC close; Monday-to-Sunday week, still incomplete at cutoff. Distance = price / level − 1. The cutoff week is excluded from the estimation sample.

#### September seasonality

September · Midterm · All · N = 2. Years: 2022, 2018.

| Week | Average return | Win rate | Actual N |
| --- | --- | --- | --- |
| Week 1 | +8.62 % | 100.0 % | 2 |
| Week 2 | -10.72 % | 50.0 % | 2 |
| Week 3 | -6.09 % | 50.0 % | 2 |
| Week 4 | +3.84 % | 50.0 % | 2 |
| Week 5 | -4.70 % | 0.0 % | 1 |

Average monthly return: -16.12 %. Monthly win rate: 0.0 %. Average weekly win rate: 50.0 %. Strongest week: 1; weakest: 2. Average weekly N: 1.8.

Returns between adjusted weekly closes. Weeks are assigned by closing date: Week 1 = days 1–7; Week 5 = days 29–31. Only completed Midterm-year Septembers before 2026; up to 10 cycles. N can vary by week. The first week may include days in August.

Seasonality provides historical context. It does not imply that the pattern will repeat.

#### ETH/BTC: relative confirmation

ETHUSD / BTCUSD ratio, daily UTC closes from the same authority. [C4]

| Date | BTC per ETH |
| --- | --- |
| 04/09/2026 | 0.03083 |
| 11/09/2026 | 0.03259 |
| 18/09/2026 | 0.03228 |

Changes calculated before rounding: +4.71% between September 4 and September 18; −0.94% between September 11 and September 18. This does not equal flows or network activity.

### AI / Technology

**Strong leadership, greater cash-flow demands**

Classification: **special section**

- **What happened:** September’s BofA survey still identifies global semiconductor longs as a very crowded trade. Crowding—many investors holding the same position—allows strong earnings and vulnerability to simultaneous selling to coexist. QQQ’s relative advantage does not eliminate that risk. [A1, C1]
- **What changed:** J.P. Morgan’s August 19 software hypothesis remains open. This edition specifies how to test it: financeable CAPEX—investment in equipment and infrastructure—and more usage converted into free cash flow (FCF) per share. The table distinguishes adoption from value creation. [A2]
- **What I expect:** [Indeed Hiring Lab](https://hiringlab.indeed.com/2026/09/17/ai-exposure-isnt-squeezing-advertised-pay-in-the-us-its-boosting-it/) finds greater advertised-wage growth in AI-exposed occupations, partly driven by more senior vacancies. The association is consistent with a premium for technology-complementary work; it proves neither causality nor actual wages paid. Monetizing AI may also require greater labor spending. [[B8]](https://hiringlab.indeed.com/2026/09/17/ai-exposure-isnt-squeezing-advertised-pay-in-the-us-its-boosting-it/)

#### Software: from usage to cash flow per share

Questions for testing August’s hypothesis; no company classification or recommendation.

| What to test | What would provide evidence |
| --- | --- |
| Growth and monetization | AI usage or consumption translating into revenue and retention rather than only free trials. |
| FCF and FCF per share | Cash flow after investment and its per-share development, considering dilution. |
| Rule of 40 / Rule of X | Revenue growth plus FCF margin; Rule of X weights growth differently. Require explicit formulas and comparable periods before scoring. |
| Revenue per employee | Productivity alongside sustainable margins and service; do not infer it from staff cuts alone. |

Rule of 40 uses 40 points as a reference for the sum rather than a guarantee of value. No universal Rule of X weight is assigned and no ranking is calculated without homogeneous methodology.

### Energy / oil

**The shock does not end at the barrel price**

Classification: **physical supply, freight and inflation**

- **What happened:** The [EIA](https://www.eia.gov/outlooks/steo/) incorporates Middle East disruptions and Hormuz restrictions into its September scenario. Its spot series’ latest available observation is September 15: Brent USD 130.80/barrel and WTI 107.02. These are physical prices rather than futures or September 18 closes. [B9–B11]
- **What changed:** [Baltic Exchange](https://www.balticexchange.com/en/data-services/WeeklyRoundup/tanker/news/2026/tanker-report-week-38.html) documents further increases in large-tanker freight toward China on September 18. The shock raises the cost of both crude and delivery. Looking only at the barrel omits part of the cost reaching companies and consumers. [[B12]](https://www.balticexchange.com/en/data-services/WeeklyRoundup/tanker/news/2026/tanker-report-week-38.html)
- **What I expect:** The channel for this report is war and disruptions → barrel and transport → inflation → [Fed](https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm) and yields → equity valuation. If persistent, it pressures margins and complicates monetary easing. Normalizing routes and freight would reduce pressure without guaranteeing a [Fed](https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm) pivot.

### USD/COP

**The domestic premium also needs confirmation**

Classification: **regional box**

- **What happened:** Alianza Research / Alianza Valores and Felipe Campos remain monitoring references. The framework separates three political-cycle stages: pre-election expectations, reaction to the result and assessment of the government. These are analytical stages rather than three pending events or an election prediction. [A3]
- **What changed:** Oil can increase export income while a global shock strengthens the dollar and reduces LatAm risk appetite. Fiscal and institutional premiums and [Banco de la República](https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/59/tasas_interes_politica_monetaria) rates determine which force weighs more on USD/COP.
- **What I expect:** Less fiscal and institutional uncertainty, together with favorable external conditions, could reduce the premium demanded on the peso. Domestic tensions and a strong dollar could increase it. This framework assigns neither ranges, political preferences nor an electoral outcome.

## Events calendar

### Events and editorial windows

| Date | Time and zone | Event | Why it matters | Assets or factors | Source | Monitoring |
| --- | --- | --- | --- | --- | --- | --- |
| September 24 | 08:30 ET · 14:30 CEST | US international investment position and transactions · second quarter | Provides context for international financing and flows. | S&P 500, Gold, BTC / ETH, Dollar | [Bureau of Economic Analysis · calendar accessed September 21, 2026](https://www.bea.gov/news/schedule/full) | [View official source](https://www.bea.gov/news/schedule/full) |
| September 30 | 08:30 ET · 14:30 CEST | GDP · third estimate of the second quarter and corporate profits | Compares growth and earnings with the rising cost of capital. | S&P 500, Gold, BTC / ETH, Dollar | [Bureau of Economic Analysis · calendar accessed September 21, 2026](https://www.bea.gov/news/schedule/full) | [View official source](https://www.bea.gov/news/schedule/full) |
| September 30 | 08:30 ET · 14:30 CEST | August PCE, personal income and spending | An inflation and consumption reference for assessing persistent rate pressure. | S&P 500, Gold, BTC / ETH, Dollar | [Bureau of Economic Analysis · calendar accessed September 21, 2026](https://www.bea.gov/news/schedule/full) | [View official source](https://www.bea.gov/news/schedule/full) |



## Possible paths

### Scenarios

#### Base path · balance with narrow participation

Firm earnings and high but orderly yields allow balance to hold. Participation remains narrow but stops deteriorating quickly. The main test is whether leaders sustain earnings and cash flow.

#### Favorable path · participation returns

RSP and IWM regain participation, flows spread out, and oil and transport stop adding inflation. With stable or declining yields, the advance would require less offsetting strength from a few companies.

#### Adverse path · breadth and leaders fail

A jump in yields and MOVE coincides with more expensive credit and another energy acceleration. Laggards keep falling and technology leaders also fail. Internal deterioration begins affecting the aggregate index.

Conditions through the next publication, without assigned probabilities. The danger is not only lost breadth: it is lost breadth and leaders at the same time.

## Checklist

Conditional monitoring · 2026-09-21. Editorial reading; automatic data frozen through September 18 with the documented qualifications.

| Factor | What it tracks | What would change the reading |
| --- | --- | --- |
| S&P breadth | Positive sectors and sectors above their 200-session average. | Sustained recovery from 2/11 and 4/11 would strengthen internal support. |
| RSP / SPY | Equal-weight S&P participation relative to the capitalization-weighted index. | RSP ceasing to lag would reduce dependence on the largest companies. |
| IWM / SPY | Small companies versus large companies. | Persistent relative improvement would confirm recovery reaching more financing-sensitive businesses. |
| Treasury 10Y | Level and speed of change in the ten-year yield. | Stability would ease valuation pressure; a rapid jump would require more earnings to sustain prices. |
| Treasury 30Y | Demand for duration and the thirty-year yield. | An increase disconnected from the short end would point to greater long-term financing pressure. |
| MOVE | Implied volatility of Treasury bonds. | A jump alongside yields and weakening breadth would turn financing costs into more immediate stress. |
| Corporate credit | The spread demanded from companies over comparable Treasuries. | Persistent widening would indicate that pressure is affecting corporate financing risk. |
| Oil and transport | Brent, WTI, available routes and tanker freight. | Lower delivery costs would ease inflation; rising barrel and transport costs would prolong pressure. |
| DXY | Dollar strength against its currency basket. | Simultaneous acceleration with yields would tighten conditions for gold, Asia and crypto. |
| GLD and gold demand | GLD shares outstanding and global ETF tonnes, with their separate dates. | Persistent demand during declines would support the reading; sustained outflows would weaken it. |
| China: consumers and property | Real residential prices and transmission into domestic spending. | Property stabilization alongside firmer consumption would give substance to the valuation thesis. |
| [BOJ](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf), the yen and JGBs | Implementation of the [BOJ](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf) decision, the currency and Japanese bonds. | An abrupt yen or JGB adjustment would increase transmission risk to exporters and global financing. |
| Bitcoin ETF flows | The balance over five complete sessions and continued inflows. | Inflows distributed over more sessions would provide stronger support than a barely positive weekly close. |
| ETH / BTC | Ratio of daily UTC closes from the same source. | Sustained relative strength together with liquidity would support a broader crypto rally. |
| Semiconductors and position concentration | Relative leadership and highly crowded exposure according to BofA. | Strong earnings with broader participation would reduce vulnerability; lost leaders would increase it. |
| AI CAPEX versus FCF | Capital investment versus free cash flow and borrowing needs. | More cash-financed investment with observable returns would reinforce cycle sustainability. |
| Software monetization | Usage converted into revenue, FCF per share and revenue per employee. | Better cash flow per share without relying on dilution would distinguish technology adoption from value creation. |
| USD / COP: regional factors | The fiscal premium, institutions, oil, BanRep rates and LatAm risk appetite. | Domestic improvements alongside favorable external conditions would ease pressure; simultaneous deterioration would increase it. |

- **S&P breadth:** [View Dashboard](/en/dashboard).

- **RSP / SPY:** [View Dashboard](/en/dashboard).

- **IWM / SPY:** [View Dashboard](/en/dashboard).

- **Treasury 10Y:** [View Fed H.15](https://www.federalreserve.gov/releases/h15/).

- **Treasury 30Y:** [View Fed H.15](https://www.federalreserve.gov/releases/h15/).

- **MOVE:** [View source and methodology](/en/reports/second-september-2026#fuentes-y-aviso).

- **Corporate credit:** [View the High Yield spread at FRED](https://fred.stlouisfed.org/series/BAMLH0A0HYM2).

- **Oil and transport:** [View the EIA energy outlook](https://www.eia.gov/outlooks/steo/).

- **DXY:** [View dollar context](/en/reports/second-september-2026#usd-cop).

- **GLD and gold demand:** [View World Gold Council](https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows/2026/09).

- **China: consumers and property:** [View FRED/BIS data](https://fred.stlouisfed.org/series/QCNR628BIS).

- **[BOJ](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf), the yen and JGBs:** [View BoJ](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf).

- **Bitcoin ETF flows:** [View Farside](https://farside.co.uk/bitcoin-etf-flow-all-data/).

- **ETH / BTC:** [View the Ethereum section](/en/reports/second-september-2026#ethereum).

- **Semiconductors and position concentration:** [View source and methodology](/en/reports/second-september-2026#fuentes-y-aviso).

- **AI CAPEX versus FCF:** [View the AI section](/en/reports/second-september-2026#ia-tecnologia).

- **Software monetization:** [View the AI section](/en/reports/second-september-2026#ia-tecnologia).

- **USD / COP: regional factors:** [View Alianza](https://www.alianza.com.co/).

## Sources and methodology

### A. Institutional research

- [A1] BofA · Global Fund Manager Survey · September 2026 · Survey September 4–10. Risks, semiconductors, equity exposure and cash: material supplied by the editor, without a public URL and without extrapolating August.
- [A2] J.P. Morgan · Software — Industry Thoughts and Rank Order / AI Disruption · August 19, 2026 · Historical framework from the [First Report](/en/reports/first-september-2026), used as a monitoring hypothesis. Institutional material supplied by the editor, without a public URL.
- [A3] Alianza Research / Alianza Valores · Felipe Campos · Institutional material identified by the editor, without a dated public document. Numerical scenarios are not included because the dated document is missing. The box develops monitoring factors and stages rather than attributing a quantitative forecast.

### B. Official and public sources

- [[B1] Federal Reserve · FOMC · 16/09/2026](https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm)
- [[B2] Federal Reserve / Treasury · H.15 · published September 18](https://www.federalreserve.gov/releases/h15/) · Ten-year yield: 5.01% on September 16; not presented as the September 18 close.
- [[B3] AAII · week ended September 16, 2026](https://www.aaii.com/sentimentsurvey)
- [[B4] World Gold Council · Global demand drives record holdings · August 2026](https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows/2026/09) · Data through August 31: +121 tonnes, inflows of 18,000 M USD and holdings of 4,189 tonnes.
- [[B5] FRED / BIS · China real residential prices · QCNR628BIS](https://fred.stlouisfed.org/series/QCNR628BIS) · National sources / [BIS](https://fred.stlouisfed.org/series/QCNR628BIS) Residential Property Price database. Quarterly, 2010=100, not seasonally adjusted; latest observation: first quarter of 2026.
- [[B6] Bank of Japan · Statement on Monetary Policy · 18/09/2026](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf) · Rate around 1.25%, effective September 24.
- [BoJ · official reference: increase from 1.00%](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918b.pdf)
- [[B7] Farside · Bitcoin ETF flows · 14–18/09](https://farside.co.uk/bitcoin-etf-flow-all-data/) · Five complete sessions; the incomplete September 21 row is excluded.
- [[B8] Indeed Hiring Lab · AI Exposure Isn’t Squeezing Advertised Pay in the US — It’s Boosting It · 17/09/2026](https://hiringlab.indeed.com/2026/09/17/ai-exposure-isnt-squeezing-advertised-pay-in-the-us-its-boosting-it/)
- [[B9] EIA · Short-Term Energy Outlook · 09/09/2026](https://www.eia.gov/outlooks/steo/) · Information through September 3.
- [[B10] EIA · Europe Brent Spot Price FOB · September 15 observation](https://www.eia.gov/dnav/pet/hist/RBRTED.htm)
- [[B11] EIA · Cushing WTI Spot Price FOB · September 15 observation](https://www.eia.gov/dnav/pet/hist/RWTCd.htm)
- [[B12] Baltic Exchange · Tanker report, week 38 · 18/09/2026](https://www.balticexchange.com/en/data-services/WeeklyRoundup/tanker/news/2026/tanker-report-week-38.html)
- [[B13] Goldman Sachs Research · The S&P 500 Is Forecast to Climb as Earnings Growth Powers Stocks Higher · 28/05/2026](https://www.goldmansachs.com/insights/articles/s-and-p-500-forecast-to-climb-as-earnings-growth-powers-stocks-higher)
- [[B14] S&P DJI · S&P U.S. Indices Methodology](https://www.spglobal.com/spdji/en/methodology/article/sp-us-indices-methodology/)
- [[B15] River / Sam Baker · The Case for a 10% Bitcoin Allocation · 02/09/2026](https://river.com/content/the-case-for-a-10-bitcoin-allocation)
- [[B16] BEA · official calendar accessed September 21, 2026](https://www.bea.gov/news/schedule/full)
- [[B17] State Street · GLD shares outstanding](https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx)
- [[B18] Goldman Sachs Research · Can the S&P 500 Rally as Treasury Yields Rise? · 15/09/2026](https://www.goldmansachs.com/insights/articles/can-the-s-and-p-500-rally-as-treasury-yields-rise)
- [[B19] Ryan Detrick / Carson · Why The Worst Month of the Year Likely Won’t Bring Rain · 31/08/2026](https://www.carsongroup.com/insights/blog/why-the-worst-month-of-the-year-likely-wont-bring-rain/)
- [[B20] Ryan Detrick / Carson · A Dove In Hawk’s Clothing? · 17/09/2026](https://www.carsongroup.com/insights/blog/a-dove-in-hawks-clothing/)
- [[B21] FRED / ICE BofA · US High Yield Option-Adjusted Spread](https://fred.stlouisfed.org/series/BAMLH0A0HYM2) · Credit-monitoring destination; adds no new observation to the frozen close.
- [[B22] Alpha Vantage · TIME_SERIES_DAILY](https://www.alphavantage.co/documentation/#daily) · Unadjusted closes for the eleven sector ETFs and radar; the report’s frozen series.
- [[B23] FRED / CBOE · VIXCLS](https://fred.stlouisfed.org/series/VIXCLS) · September 17 spot VIX; V1 adapter source.
- [[B24] Bitbo / BitcoinTreasuries · Bitcoin ETF flows](https://bitbo.io/treasuries/etf-flows/) · Primary source of the V1 adapter; historical table and cache not preserved at cutoff. Does not replace [Farside](https://farside.co.uk/bitcoin-etf-flow-all-data/) for independent flow readings.
- [[B25] Alianza · public institutional reference](https://www.alianza.com.co/) · Identifies the institution and monitoring reference. It is not the source of Felipe Campos’ numerical scenarios; see A3.
- [[B26] Banco de la República · monetary-policy rate](https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/59/tasas_interes_politica_monetaria) · Institutional reference for the USD/COP monitoring framework; no figure is added to the report.

### C. My own data and calculations

- [[C1] Dashboard and September 4 → September 18 comparison](/en/dashboard) · Five sessions / six closes per window. Radar: [Alpha Vantage](https://www.alphavantage.co/documentation/#daily). VIX: September 17. Live link; frozen snapshot.
- [[C2] Statistical Levels · September 19 authority; closes admitted through September 18](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html) · [Yahoo Finance](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-datos.html): historical series, with asset-specific links in the methodology. Crypto: UTC close. Midterm excludes 2026, with actual N; SPY autumn: eight cycles.
- [C3] Bitcoin 2020–2025 · second in-house sample · Six complete years; partial 2026 excluded.
- [C4] ETH/BTC · editorial calculation from frozen closes · Same UTC series; changes before rounding. Evidence preserved.
- [[C5] Bounded V1 Regime replay · September 18, 2026 deployment · commit 4ee6adb006f360fea13837db5f7d45815f297b55](https://www.luiguiherrera.com/methodology/segundo-informe-septiembre-2026-regimen.html) · 6,049 cases; invariant category and 70–77 range, conditional on September 18 sectors and September 17 VIX retrieved on September 21. Does not identify the exact historical cache or publish point confidence.
- [[C6] First September report · editorial and historical reference](/en/reports/first-september-2026)

### Sources and method

Market through September 18; edition and source consultation through September 21. Each series keeps its date and convention. Ten comparable metrics; V1 classification reconstructed through bounded replay conditional on reconciled sectors and VIX. Levels from the weekly opening and separate seasonal samples. External references are attributed rather than treated as my own targets.

### Limitations and educational notice

Educational content, without personalized advice or recommendations. Conditional scenarios; seasonality does not guarantee results. Levels are historical extensions rather than support, resistance or targets.
