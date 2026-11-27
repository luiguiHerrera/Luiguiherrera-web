import {diagnosticQuestions,getQuestionsForMode} from './questions.ts';
import type {DiagnosticAnswers,DiagnosticMode} from './types.ts';

export function solidAnswers(mode: DiagnosticMode, products: string[] = ['indexFunds']): DiagnosticAnswers {
 const answers: DiagnosticAnswers={};
 for(const q of diagnosticQuestions.filter(q=>q.mode.includes(mode)))answers[q.id]=q.multi?products:q.options[0].id;
 Object.assign(answers,{
 capital_reference:'10000',products_known:products,declared_drop:'35',pressure_drop:'written_rule',
 years_real:'gt8',real_drawdown:'held',process_docs:'full',claim_vs_validate:'low',
 real_money_products_complete:'stocks',decision_years_complete:'gt7',worst_real_drawdown_complete:'25_40',drawdown_action_complete:'held_reviewed',
 });
 const active=new Set(getQuestionsForMode(mode,answers).map(q=>q.id));
 return Object.fromEntries(Object.entries(answers).filter(([id])=>active.has(id)));
}
export function patchAnswers(mode: DiagnosticMode, patch: DiagnosticAnswers, products?: string[]) {
 const answer={...solidAnswers(mode,products),...patch};
 for(const q of getQuestionsForMode(mode,answer)) if(answer[q.id]===undefined)answer[q.id]=q.multi?[]:q.options[0].id;
 return answer;
}
export const regressionCases: {id: string; patch: DiagnosticAnswers}[] = [
 {id:'beginner',patch:{products_known:['none'],years_real:'lt1',real_drawdown:'no',process_docs:'summary',claim_vs_validate:'low',stock_basic:'unsure',risk_return:'past_only',diversification:'avoid_loss',bond_rates:'fixed',product_costs_complete:'visible_fee',liquidity_product_complete:'short_bad',real_money_products_complete:'none',decision_years_complete:'none',worst_real_drawdown_complete:'none',drawdown_action_complete:'not_lived'}},
 {id:'unstable-income',patch:{income_stability:'uncertain'}},
 {id:'no-surplus',patch:{surplus_cash_flow:'tight_or_deficit'}},
 {id:'expensive-debt',patch:{expensive_debt:'pending_priority'}},
 {id:'no-emergency-fund',patch:{emergency_months:'none'}},
 {id:'near-capital-need',patch:{cash_need_12m:'certain'}},
 {id:'capacity-high-tolerance-low',patch:{declared_drop:'5'}},
 {id:'capacity-low-tolerance-high',patch:{income_stability:'uncertain',surplus_cash_flow:'tight_or_deficit',emergency_months:'none',loss_life_effect:'serious',declared_drop:'more'}},
 {id:'experienced-fragile',patch:{income_stability:'uncertain',surplus_cash_flow:'tight_or_deficit',expensive_debt:'pending_priority',emergency_months:'none',savings_share:'almost_all',loss_life_effect:'serious'}},
 {id:'overconfident-knowledge-gap',patch:{claim_vs_validate:'high',stock_basic:'guarantee',risk_return:'less_risk',fast_gain:'increase'}},
 {id:'leverage-gap',patch:{products_known:['leverage'],leverage_check:'interest_only'}},
 {id:'options-gap',patch:{products_known:['options'],options_check:'guaranteed'}},
 {id:'fomo',patch:{fomo_behavior:'confirm',slow_underperformance:'compare'}},
 {id:'unrealistic-expectations',patch:{return_expectation:'gt25'}},
 {id:'solid-experienced',patch:{}},
];
