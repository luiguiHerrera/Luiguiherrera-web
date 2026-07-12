export type PracticeLocale = "es" | "en";
export type ControlLevel = "control" | "balance" | "exposure";

export type Decision = {
  title: string;
  description?: string;
  immediate: string;
  secondary: string;
  reading: string;
  review: string[];
  alert: string;
  learning: string;
  level: ControlLevel;
  tradeoff: { protect: string; sacrifice: string; depend: string };
};

export type PracticeCase = {
  slug: string;
  category: string;
  title: string;
  situation: string;
  facts: { label: string; value: string }[];
  metric: { title: string; rows: { label: string; value: string; status?: "known" | "expected" | "verified" | "incomplete" | "unknown" }[] };
  decisions: Decision[];
};

const es: PracticeCase[] = [
  {
    slug: "liquidez-deuda", category: "Liquidez y deuda", title: "Una oportunidad mientras pagas deuda cara",
    situation: "Tienes COP 25 millones ahorrados y COP 20 millones en deuda de tarjeta y libre inversión. Un conocido te muestra una inversión que podría rendir 15% anual. Tu flujo mensual está ajustado y actualmente solo tienes un mes de gastos como reserva.",
    facts: [
      { label: "Ahorro", value: "COP 25 millones" }, { label: "Deuda", value: "COP 20 millones" },
      { label: "Tasa promedio de la deuda", value: "27% E.A." }, { label: "Cuota mensual", value: "COP 1,1 millones" },
      { label: "Gastos esenciales", value: "COP 5 millones al mes" }, { label: "Fondo de emergencia", value: "Un mes" },
      { label: "Flujo libre mensual", value: "COP 600.000" }, { label: "Rendimiento mencionado", value: "15% esperado" },
      { label: "Salida de la inversión", value: "Hasta 90 días" },
    ],
    metric: { title: "Costo conocido frente a rendimiento esperado", rows: [
      { label: "Costo de la deuda", value: "27% E.A. conocido", status: "known" },
      { label: "Rendimiento mencionado", value: "15% E.A. esperado", status: "expected" },
      { label: "Diferencia nominal", value: "12 puntos" }, { label: "Disponibilidad del ahorro", value: "Inmediata" },
      { label: "Disponibilidad de inversión", value: "Hasta 90 días" },
    ] },
    decisions: [
      { title: "Pagar toda la deuda", immediate: "Eliminas un costo financiero alto y liberas la cuota mensual. Quedas con COP 5 millones, equivalentes a aproximadamente un mes de gastos esenciales.", secondary: "El flujo mejora, pero una emergencia grande puede obligarte a utilizar nuevamente crédito. El resultado depende de reconstruir la reserva antes de asumir nuevos compromisos.", reading: "Pagar deuda cara reduce un costo conocido. Sin embargo, utilizar casi toda la liquidez puede trasladar el problema desde los intereses hacia la falta de reserva.", review: ["Estabilidad de los ingresos", "Reserva mínima necesaria", "Condiciones de prepago", "Tiempo para reconstruir el fondo", "Riesgo de volver a endeudarse"], alert: "La deuda desaparece, pero la liquidez queda en el mínimo.", learning: "Una mejora del balance puede crear una vulnerabilidad temporal en el flujo.", level: "balance", tradeoff: { protect: "El flujo frente a intereses altos.", sacrifice: "Reserva para imprevistos.", depend: "Reconstruir el fondo sin usar nueva deuda." } },
      { title: "Invertir todo y seguir pagando", immediate: "Mantienes una deuda que cuesta 27% y expones el ahorro a una rentabilidad esperada de 15%. El dinero invertido no estaría disponible de inmediato.", secondary: "Un gasto inesperado podría obligarte a utilizar más crédito. Incluso si la inversión alcanza el resultado esperado, el costo de la deuda puede continuar siendo superior.", reading: "Las dos tasas no son equivalentes. El interés de la deuda es contractual; el rendimiento de la inversión es incierto y puede incluir costos, impuestos o pérdidas.", review: ["Costo efectivo de la deuda", "Incertidumbre del rendimiento", "Liquidez del producto", "Fondo de emergencia", "Flujo mensual después de la cuota"], alert: "Se mantiene un costo alto para perseguir un resultado menor e incierto.", learning: "Una inversión no compensa necesariamente un flujo debilitado por deuda costosa.", level: "exposure", tradeoff: { protect: "Acceso a la oportunidad.", sacrifice: "Liquidez y reducción de deuda.", depend: "Que la inversión funcione y no aparezcan imprevistos." } },
      { title: "Reservar y amortizar lo más caro", description: "Mantienes COP 15 millones como reserva de tres meses y utilizas COP 10 millones para reducir primero la deuda de mayor tasa.", immediate: "No eliminas toda la deuda, pero reduces intereses y conservas capacidad para afrontar imprevistos.", secondary: "El flujo liberado puede utilizarse para terminar de pagar la deuda y después iniciar aportes de inversión. La oportunidad actual podría pasar.", reading: "La decisión no tiene que ser todo a deuda o todo a inversión. El orden de las acciones puede reducir la probabilidad de volver a endeudarse.", review: ["Tamaño adecuado de la reserva", "Orden de las deudas por tasa", "Flujo liberado", "Plazo para terminar de pagar", "Momento realista para comenzar a invertir"], alert: "El plan pierde efectividad si se toma nueva deuda mientras se ejecuta.", learning: "La capacidad sostenible de invertir comienza con liquidez suficiente y deuda controlada.", level: "control", tradeoff: { protect: "La reserva y parte del flujo.", sacrifice: "Inversión inmediata y eliminación total de la deuda.", depend: "Mantener el plan de pagos." } },
    ],
  },
  {
    slug: "producto-dudoso", category: "Producto dudoso", title: "24% anual, bajo riesgo y cupos limitados",
    situation: "Un amigo te recomienda una inversión privada que ofrece 24% anual. La empresa afirma que el riesgo es bajo, que paga mensualmente y que quedan pocos cupos. Para participar debes transferir al menos COP 20 millones esta semana.",
    facts: [
      { label: "Rentabilidad ofrecida", value: "24% anual" }, { label: "Riesgo descrito", value: "“Bajo”" },
      { label: "Inversión mínima", value: "COP 20 millones" }, { label: "Retiro", value: "60 días de anticipación" },
      { label: "Regulación", value: "No explicada" }, { label: "Custodia", value: "La misma empresa" },
      { label: "Documentación", value: "Presentación y contrato breve" }, { label: "Comisión por referidos", value: "3%" },
      { label: "Respaldo mencionado", value: "“Activos reales”, sin detalle verificable" },
    ],
    metric: { title: "Estado de verificación", rows: [
      { label: "Regulación", value: "No informada", status: "unknown" }, { label: "Custodia", value: "Sin separación", status: "incomplete" },
      { label: "Fuente del rendimiento", value: "Incompleta", status: "incomplete" }, { label: "Salida", value: "Condicionada", status: "incomplete" },
      { label: "Conflicto de interés", value: "Presente", status: "incomplete" },
    ] },
    decisions: [
      { title: "Pedir documentos y revisar", immediate: "La empresa entrega más información o evita responder algunas preguntas. El cupo puede cerrarse mientras revisas.", secondary: "Tener documentos no significa que sean auténticos, suficientes o favorables. Todavía falta comprobar la información y entender quién absorbe las pérdidas.", reading: "La documentación es necesaria, pero no equivale a verificación. Un documento comercial puede explicar el producto sin demostrar que los activos, garantías o resultados existen.", review: ["Entidad legal y responsables", "Supervisión aplicable", "Estados financieros verificables", "Custodio independiente", "Uso del dinero", "Escenario de incumplimiento"], alert: "La información debe poder comprobarse fuera del material comercial.", learning: "Recibir una respuesta no es lo mismo que verificarla.", level: "balance", tradeoff: { protect: "Parte del proceso de análisis.", sacrifice: "Tiempo frente al supuesto cupo.", depend: "Verificar los documentos de forma independiente." } },
      { title: "Invertir el mínimo por recomendación", immediate: "Obtienes acceso al producto y tu amigo recibe una comisión. La empresa puede comenzar a realizar los pagos prometidos.", secondary: "Los primeros pagos no demuestran que el modelo sea sostenible ni que el capital esté protegido. Si aparecen problemas, la recuperación dependerá de contratos, custodia y activos todavía poco claros.", reading: "Una relación personal puede reducir la sensación de riesgo, pero no cambia la estructura del producto. La comisión también crea un incentivo que conviene reconocer.", review: ["Fuente económica del rendimiento", "Custodia del dinero", "Regulación", "Derechos de salida", "Incentivos de quien recomienda", "Evidencia del supuesto respaldo"], alert: "La confianza personal está sustituyendo parte de la verificación.", learning: "Conocer a quien recomienda no significa comprender dónde queda el dinero ni cómo se recupera.", level: "exposure", tradeoff: { protect: "Acceso al supuesto cupo.", sacrifice: "Control, liquidez y verificabilidad.", depend: "Promesas que todavía no han sido comprobadas." } },
      { title: "No transferir sin verificar", immediate: "Puedes perder el cupo y una rentabilidad que finalmente podría materializarse. El capital permanece disponible.", secondary: "Si el producto fuera legítimo, habrás renunciado a una oportunidad. Si no lo fuera, evitaste asumir un riesgo difícil de medir y posiblemente difícil de recuperar.", reading: "No es necesario demostrar que un producto es fraudulento para decidir que la información disponible es insuficiente. “No puedo medir este riesgo” es una conclusión válida.", review: ["Evidencia independiente", "Separación entre emisor y custodio", "Coherencia entre retorno, riesgo y liquidez", "Incentivos comerciales", "Procedimiento si se suspenden los retiros", "Jurisdicción y mecanismo de reclamación"], alert: "La urgencia comercial beneficia principalmente a quien recibe el dinero.", learning: "Si no puedes explicar cómo se genera, protege y devuelve el capital, todavía no puedes evaluar la inversión.", level: "control", tradeoff: { protect: "Capital, liquidez y capacidad de verificación.", sacrifice: "Acceso inmediato.", depend: "Mantener el criterio aunque exista presión social." } },
    ],
  },
];

const en: PracticeCase[] = es.map((item) => item); // Replaced below with adapted English content.

en[0] = {
  ...es[0], category: "Liquidity and debt", title: "An opportunity while carrying expensive debt",
  situation: "You have COP 25 million in savings and COP 20 million in credit-card and personal-loan debt. Someone you know presents an investment that may return 15% a year. Monthly cash flow is tight, and your reserve currently covers only one month of expenses.",
  facts: [{label:"Savings",value:"COP 25 million"},{label:"Debt",value:"COP 20 million"},{label:"Average debt rate",value:"27% E.A."},{label:"Monthly payment",value:"COP 1.1 million"},{label:"Essential spending",value:"COP 5 million a month"},{label:"Emergency fund",value:"One month"},{label:"Monthly free cash flow",value:"COP 600,000"},{label:"Stated return",value:"15% expected"},{label:"Investment exit",value:"Up to 90 days"}],
  metric: { title: "Known cost versus expected return", rows: [{label:"Debt cost",value:"27% E.A. known",status:"known"},{label:"Stated return",value:"15% E.A. expected",status:"expected"},{label:"Nominal gap",value:"12 points"},{label:"Savings availability",value:"Immediate"},{label:"Investment availability",value:"Up to 90 days"}] },
  decisions: [
    { title:"Pay off all debt", immediate:"You remove a high financing cost and free the monthly payment. COP 5 million remains—about one month of essential expenses.", secondary:"Cash flow improves, but a large emergency could force you to borrow again. The outcome depends on rebuilding the reserve before taking on new commitments.", reading:"Paying expensive debt removes a known cost. Using nearly all available cash, however, may shift the problem from interest expense to a thin reserve.", review:["Income stability","Minimum reserve needed","Prepayment terms","Time needed to rebuild the fund","Risk of borrowing again"], alert:"The debt disappears, but liquidity falls to the minimum.", learning:"A stronger balance sheet can create a temporary cash-flow vulnerability.", level:"balance", tradeoff:{protect:"Cash flow from high interest costs.",sacrifice:"Your emergency reserve.",depend:"Rebuilding the fund without new debt."}},
    { title:"Invest everything and keep paying", immediate:"You keep debt costing 27% while exposing savings to an expected 15% return. The invested money would not be immediately available.", secondary:"An unexpected expense could require more credit. Even if the investment meets expectations, the debt may continue to cost more.", reading:"The rates are not equivalent. Debt interest is contractual; investment return is uncertain and may be reduced by fees, taxes, or losses.", review:["Effective debt cost","Return uncertainty","Product liquidity","Emergency fund","Cash flow after the payment"], alert:"A high known cost remains in pursuit of a lower, uncertain result.", learning:"An investment does not necessarily offset cash flow weakened by expensive debt.", level:"exposure", tradeoff:{protect:"Access to the opportunity.",sacrifice:"Liquidity and debt reduction.",depend:"The investment working and no surprises occurring."}},
    { title:"Keep a reserve and reduce the costliest debt", description:"You keep COP 15 million as a three-month reserve and use COP 10 million to reduce the highest-rate debt first.", immediate:"You do not remove all debt, but you lower interest expense and retain capacity for unexpected costs.", secondary:"Freed-up cash flow can finish paying the debt and later fund investments. The current opportunity may pass.", reading:"The choice need not be all debt or all investment. Sequencing can reduce the chance of having to borrow again.", review:["Appropriate reserve size","Debt order by rate","Cash flow released","Payoff timeline","A realistic point to begin investing"], alert:"The plan loses effectiveness if new debt is added while it is underway.", learning:"Sustainable investing capacity starts with adequate liquidity and controlled debt.", level:"control", tradeoff:{protect:"The reserve and part of cash flow.",sacrifice:"Immediate investing and full debt elimination.",depend:"Following the payment plan."}},
  ],
};

en[1] = {
  ...es[1], category:"Questionable product", title:"24% a year, low risk, and limited availability",
  situation:"A friend recommends a private investment offering 24% a year. The company calls the risk low, says it pays monthly, and claims few spots remain. Participation requires transferring at least COP 20 million this week.",
  facts:[{label:"Offered return",value:"24% a year"},{label:"Stated risk",value:"“Low”"},{label:"Minimum investment",value:"COP 20 million"},{label:"Withdrawal",value:"60 days’ notice"},{label:"Regulation",value:"Not explained"},{label:"Custody",value:"The same company"},{label:"Documents",value:"Presentation and short contract"},{label:"Referral fee",value:"3%"},{label:"Stated backing",value:"“Real assets,” without verifiable detail"}],
  metric:{title:"Verification status",rows:[{label:"Regulation",value:"Not disclosed",status:"unknown"},{label:"Custody",value:"Not separated",status:"incomplete"},{label:"Source of return",value:"Incomplete",status:"incomplete"},{label:"Exit",value:"Conditional",status:"incomplete"},{label:"Conflict of interest",value:"Present",status:"incomplete"}]},
  decisions:[
    {title:"Request documents and review",immediate:"The company provides more information or avoids some questions. The offer may close while you review it.",secondary:"Having documents does not make them authentic, sufficient, or favorable. You still need to verify the information and understand who absorbs losses.",reading:"Documentation is necessary, but it is not verification. Marketing material can describe a product without proving that its assets, guarantees, or results exist.",review:["Legal entity and responsible parties","Applicable supervision","Verifiable financial statements","Independent custodian","Use of funds","Default scenario"],alert:"The information must be verifiable outside the sales material.",learning:"Receiving an answer is not the same as verifying it.",level:"balance",tradeoff:{protect:"Part of the review process.",sacrifice:"Time against the claimed deadline.",depend:"Independent verification of the documents."}},
    {title:"Invest the minimum based on the referral",immediate:"You gain access and your friend receives a commission. The company may begin making the promised payments.",secondary:"Early payments do not prove the model is sustainable or the principal protected. Recovery would depend on contracts, custody, and assets that remain unclear.",reading:"A personal relationship can lower the feeling of risk, but it does not change the product structure. The commission is also an incentive worth recognizing.",review:["Economic source of return","Custody of funds","Regulation","Exit rights","Referrer incentives","Evidence of the stated backing"],alert:"Personal trust is replacing part of the verification process.",learning:"Knowing the referrer does not explain where the money sits or how it can be recovered.",level:"exposure",tradeoff:{protect:"Access to the claimed opening.",sacrifice:"Control, liquidity, and verifiability.",depend:"Promises that have not been independently checked."}},
    {title:"Do not transfer without verification",immediate:"You may lose the opening and a return that could ultimately materialize. Your capital remains available.",secondary:"If the product is legitimate, you gave up an opportunity. If it is not, you avoided a risk that was hard to measure and potentially hard to recover from.",reading:"You do not need to prove a product fraudulent to decide that the available information is insufficient. “I cannot measure this risk” is a valid conclusion.",review:["Independent evidence","Separation of issuer and custodian","Consistency of return, risk, and liquidity","Commercial incentives","Process if withdrawals stop","Jurisdiction and claims mechanism"],alert:"Commercial urgency mainly benefits the party receiving the money.",learning:"If you cannot explain how capital is generated, protected, and returned, you cannot yet assess the investment.",level:"control",tradeoff:{protect:"Capital, liquidity, and the ability to verify.",sacrifice:"Immediate access.",depend:"Keeping your standards under social pressure."}},
  ],
};

export const investmentPracticeCases: Record<PracticeLocale, PracticeCase[]> = { es, en };
