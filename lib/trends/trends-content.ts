import type { Locale } from "@/lib/i18n/locales";

export type TrendVehicle =
  | "indice amplio"
  | "ETF sectorial"
  | "ETF tematico"
  | "accion individual"
  | "empresa privada"
  | "infraestructura"
  | "observacion";

export type TrendRole = "nucleo" | "satelite" | "apuesta" | "todavia no invertible";

export type TrendRisk =
  | "valoracion"
  | "hype"
  | "regulacion"
  | "competencia"
  | "concentracion"
  | "timing"
  | "liquidez";

export type TrendObservableVehicleKind =
  | "indice amplio"
  | "ETF dedicado"
  | "ETF sectorial"
  | "ETF tematico"
  | "accion liquida"
  | "infraestructura"
  | "observacion";

export type TrendObservableVehicle = {
  ticker: string;
  name: string;
  kind: TrendObservableVehicleKind;
  note: string;
  statisticalLevelsSymbol?: string;
};

export type TrendItem = {
  id: string;
  name: string;
  short: string;
  educationalState: string;
  primaryRisks: TrendRisk[];
  changing: string;
  valueChain: string;
  capture: string;
  vehicles: TrendVehicle[];
  observableVehicles: TrendObservableVehicle[];
  role: TrendRole;
  bullCase: string;
  bearCase: string;
  risks: TrendRisk[];
  failure: string;
  controlQuestion: string;
  nextStep: string;
};

type TrendBaseItem = Omit<TrendItem, "observableVehicles">;

export type TrendsContent = {
  locale: Locale;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    text: string;
    badges: string[];
    note: string;
  };
  system: {
    eyebrow: string;
    title: string;
    intro: string;
    items: { label: string; question: string; href: string }[];
  };
  map: {
    eyebrow: string;
    title: string;
    intro: string;
    cta: string;
    selectedLabel: string;
  };
  detailLabels: {
    changing: string;
    valueChain: string;
    capture: string;
    vehicles: string;
    role: string;
    bullCase: string;
    bearCase: string;
    risks: string;
    failure: string;
    controlQuestion: string;
    nextStep: string;
  };
  methodology: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: string[];
    closing: string;
  };
  sources: {
    eyebrow: string;
    title: string;
    intro: string;
    items: { source: string; note: string }[];
    creditNote: string;
  };
  tension: {
    title: string;
    text: string;
    reasons: string[];
  };
  trends: TrendItem[];
};

const esControlQuestion = "¿Estoy evaluando una tendencia real o una narrativa que me emociona?";
const enControlQuestion = "Am I studying a real trend, or a narrative that excites me?";

const esTrends: TrendBaseItem[] = [
  {
    id: "ai",
    name: "Inteligencia artificial",
    short: "Modelos, datos e infraestructura cambian cómo se produce software, contenido y análisis.",
    educationalState: "Revisar valoración",
    primaryRisks: ["valoracion", "concentracion", "competencia"],
    changing: "La IA está moviendo tareas cognitivas hacia sistemas que escriben, resumen, programan, clasifican y asisten decisiones.",
    valueChain: "Chips, centros de datos, energía, modelos, datos, software de aplicación, integradores y usuarios empresariales.",
    capture: "La captura puede quedar en infraestructura, plataformas dominantes, software vertical o empresas que elevan márgenes con automatización.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada", "infraestructura"],
    role: "satelite",
    bullCase: "La productividad podría expandirse si las empresas convierten IA en ahorro, nuevos productos o mejores procesos.",
    bearCase: "Parte del valor puede estar ya reflejado en precios y concentrado en pocos proveedores.",
    risks: ["valoracion", "hype", "competencia", "concentracion", "timing"],
    failure: "La hipótesis falla si el uso real no mejora márgenes, si la regulación encarece el despliegue o si la competencia commoditiza la tecnología.",
    controlQuestion: esControlQuestion,
    nextStep: "Separar infraestructura, software y adopción empresarial antes de elegir qué parte observar.",
  },
  {
    id: "automation",
    name: "Automatización",
    short: "Procesos industriales, logísticos y administrativos buscan operar con menos fricción humana.",
    educationalState: "Analizar vehículo",
    primaryRisks: ["timing", "competencia", "valoracion"],
    changing: "La escasez de mano de obra, la presión de costes y la digitalización empujan a automatizar procesos repetibles.",
    valueChain: "Sensores, software industrial, maquinaria, integradores, mantenimiento, datos operativos y clientes finales.",
    capture: "Podrían capturar valor quienes reduzcan costes medibles o controlen plataformas críticas de operación.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "Puede mejorar productividad en sectores con costes laborales altos o necesidad de precisión constante.",
    bearCase: "La adopción suele ser lenta, cíclica y dependiente de presupuestos de capital.",
    risks: ["competencia", "timing", "valoracion", "liquidez"],
    failure: "Falla si los clientes retrasan inversión, si el retorno operativo no compensa la complejidad o si hay presión de precios.",
    controlQuestion: esControlQuestion,
    nextStep: "Mirar si el cambio mejora una métrica concreta: coste, velocidad, seguridad o capacidad.",
  },
  {
    id: "energy",
    name: "Energía",
    short: "Electrificación, redes, almacenamiento y seguridad energética reordenan la demanda de capital.",
    educationalState: "Observar ciclos",
    primaryRisks: ["regulacion", "timing", "valoracion"],
    changing: "La demanda eléctrica crece por digitalización, centros de datos, electrificación y transición de fuentes.",
    valueChain: "Generación, redes, almacenamiento, equipos, materias primas, servicios, eficiencia y financiación de proyectos.",
    capture: "La captura puede estar en activos regulados, proveedores de equipos, operadores de infraestructura o eficiencia energética.",
    vehicles: ["indice amplio", "ETF sectorial", "accion individual", "infraestructura", "observacion"],
    role: "satelite",
    bullCase: "La necesidad de capacidad fiable puede sostener inversión durante años.",
    bearCase: "Los retornos dependen de regulación, permisos, commodities y ciclos de capital intensivos.",
    risks: ["regulacion", "timing", "valoracion", "liquidez", "competencia"],
    failure: "Falla si la demanda no crece como se espera, si cambian incentivos o si los proyectos destruyen valor por sobrecostes.",
    controlQuestion: esControlQuestion,
    nextStep: "Distinguir entre demanda estructural, exposición a commodities e infraestructura regulada.",
  },
  {
    id: "longevity",
    name: "Salud y longevidad",
    short: "Demografía, biotecnología y prevención empujan nuevas formas de cuidado.",
    educationalState: "Riesgo regulatorio",
    primaryRisks: ["regulacion", "liquidez", "timing"],
    changing: "El envejecimiento poblacional y nuevas terapias amplían la demanda de salud, diagnóstico y prevención.",
    valueChain: "Investigación, ensayos, dispositivos, hospitales, aseguradoras, datos clínicos, distribución y servicios de cuidado.",
    capture: "Puede capturar valor quien pruebe eficacia, obtenga reembolso, escale distribución o controle datos útiles.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada", "observacion"],
    role: "satelite",
    bullCase: "La demanda de salud tiene viento demográfico y necesidades poco cíclicas.",
    bearCase: "Muchos avances no superan ensayos, aprobación, precio o adopción clínica.",
    risks: ["regulacion", "liquidez", "timing", "valoracion", "competencia"],
    failure: "Falla si la evidencia clínica no llega, si no hay reembolso o si el producto no se integra en el sistema de salud.",
    controlQuestion: esControlQuestion,
    nextStep: "Separar salud defensiva, innovación clínica y servicios de longevidad antes de formular la hipótesis.",
  },
  {
    id: "cybersecurity",
    name: "Ciberseguridad",
    short: "Más superficie digital implica más necesidad de proteger identidad, datos e infraestructura.",
    educationalState: "Analizar vehículo",
    primaryRisks: ["competencia", "valoracion", "concentracion"],
    changing: "La nube, IA, trabajo distribuido y ataques más sofisticados elevan la seguridad a función crítica.",
    valueChain: "Identidad, endpoints, nube, red, datos, cumplimiento, respuesta a incidentes y servicios gestionados.",
    capture: "Podrían capturar valor plataformas con distribución, integración y capacidad de reducir complejidad operativa.",
    vehicles: ["ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "El gasto puede ser resiliente porque el coste de una brecha severa es alto.",
    bearCase: "El sector es competitivo y las ventajas pueden cambiar con rapidez técnica.",
    risks: ["competencia", "valoracion", "concentracion", "hype", "timing"],
    failure: "Falla si la consolidación reduce márgenes, si los clientes recortan herramientas duplicadas o si una plataforma pierde confianza.",
    controlQuestion: esControlQuestion,
    nextStep: "Evaluar si la hipótesis depende de crecimiento del gasto, consolidación o una categoría técnica concreta.",
  },
  {
    id: "fintech",
    name: "Digitalización financiera",
    short: "Pagos, crédito, datos y experiencia de usuario siguen migrando hacia capas digitales.",
    educationalState: "Riesgo regulatorio",
    primaryRisks: ["regulacion", "competencia", "valoracion"],
    changing: "Los servicios financieros se vuelven más modulares, con pagos instantáneos, datos abiertos y distribución digital.",
    valueChain: "Pagos, core bancario, fraude, identidad, crédito, infraestructura, wallets, datos y cumplimiento.",
    capture: "La captura puede estar en redes, infraestructura de bajo coste, distribución o software regulatorio.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "La digitalización puede reducir fricción y ampliar acceso con modelos escalables.",
    bearCase: "La regulación, los costes de adquisición y la competencia bancaria pueden comprimir retornos.",
    risks: ["regulacion", "competencia", "valoracion", "liquidez", "timing"],
    failure: "Falla si el crecimiento requiere subsidios permanentes, si aumenta el coste regulatorio o si la morosidad deteriora el modelo.",
    controlQuestion: esControlQuestion,
    nextStep: "Identificar si la tesis está en infraestructura, distribución, crédito o pagos.",
  },
  {
    id: "crypto",
    name: "Bitcoin / criptoinfraestructura",
    short: "Activos digitales e infraestructura abierta plantean una nueva capa de liquidación y custodia.",
    educationalState: "Alta narrativa",
    primaryRisks: ["regulacion", "hype", "timing"],
    changing: "Bitcoin, stablecoins, custodia y redes públicas mantienen el debate sobre dinero digital e infraestructura financiera abierta.",
    valueChain: "Protocolos, custodia, exchanges, minería, pagos, stablecoins, seguridad, wallets y cumplimiento.",
    capture: "La captura puede no estar en el protocolo que atrae atención, sino en infraestructura, custodia o servicios regulados.",
    vehicles: ["ETF tematico", "accion individual", "empresa privada", "infraestructura", "observacion"],
    role: "apuesta",
    bullCase: "La adopción institucional y la infraestructura regulada pueden ampliar el uso y la legitimidad del ecosistema.",
    bearCase: "La volatilidad, la regulación y la falta de flujos tradicionales complican la valoración.",
    risks: ["regulacion", "hype", "timing", "liquidez", "concentracion"],
    failure: "Falla si la adopción se queda en narrativa, si la regulación limita casos de uso o si el riesgo operativo domina.",
    controlQuestion: esControlQuestion,
    nextStep: "Separar reserva de valor, infraestructura, pagos y aplicaciones antes de asignar un rol.",
  },
  {
    id: "defense",
    name: "Defensa y seguridad",
    short: "Geopolítica, drones, software y resiliencia elevan el gasto en seguridad.",
    educationalState: "Observar presupuestos",
    primaryRisks: ["regulacion", "concentracion", "timing"],
    changing: "La tensión geopolítica y la modernización militar desplazan gasto hacia sensores, software, drones y defensa crítica.",
    valueChain: "Contratistas, electrónica, satélites, ciberdefensa, logística, drones, municiones, software y servicios.",
    capture: "Podrían capturar valor proveedores con contratos duraderos, capacidades escasas o integración en sistemas críticos.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "Los presupuestos de seguridad pueden ser persistentes cuando cambia el mapa geopolítico.",
    bearCase: "El gasto depende de política pública, ciclos de contratación y concentración de clientes.",
    risks: ["regulacion", "concentracion", "timing", "valoracion", "liquidez"],
    failure: "Falla si los presupuestos se moderan, si los programas se retrasan o si la exposición depende de pocos contratos.",
    controlQuestion: esControlQuestion,
    nextStep: "Revisar qué parte del gasto es estructural y qué parte responde a un evento puntual.",
  },
  {
    id: "water-food",
    name: "Agua y alimentos",
    short: "Escasez, productividad agrícola y resiliencia hídrica ganan importancia económica.",
    educationalState: "Observar",
    primaryRisks: ["timing", "regulacion", "liquidez"],
    changing: "Clima, urbanización y seguridad alimentaria aumentan la necesidad de eficiencia en agua y producción agrícola.",
    valueChain: "Tratamiento, distribución, riego, semillas, fertilizantes, maquinaria, logística, datos agrícolas y alimentos.",
    capture: "La captura puede estar en infraestructura local, tecnologías de eficiencia, insumos críticos o distribución.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "infraestructura", "observacion"],
    role: "satelite",
    bullCase: "Son necesidades básicas con inversión acumulada insuficiente en muchas regiones.",
    bearCase: "La exposición pública puede ser indirecta y depender de regulación, clima y ciclos agrícolas.",
    risks: ["timing", "regulacion", "liquidez", "valoracion", "competencia"],
    failure: "Falla si no hay vehículo claro, si los márgenes dependen de commodities o si la regulación limita precios.",
    controlQuestion: esControlQuestion,
    nextStep: "Separar agua regulada, tecnología agrícola, insumos y distribución alimentaria.",
  },
  {
    id: "infrastructure",
    name: "Infraestructura",
    short: "Redes, transporte, datos y energía necesitan renovación y expansión.",
    educationalState: "Analizar vehículo",
    primaryRisks: ["regulacion", "liquidez", "valoracion"],
    changing: "La economía digital y la transición energética requieren redes eléctricas, centros de datos, transporte y activos resilientes.",
    valueChain: "Operadores, constructores, concesiones, equipos, financiación, mantenimiento, energía y suelo.",
    capture: "Puede capturar valor quien tenga activos difíciles de replicar, contratos estables o poder de fijación regulado.",
    vehicles: ["indice amplio", "ETF sectorial", "accion individual", "infraestructura"],
    role: "nucleo",
    bullCase: "Puede aportar exposición a activos reales con demanda de largo plazo.",
    bearCase: "El apalancamiento, tipos de interés, regulación y ejecución de proyectos pueden pesar mucho.",
    risks: ["regulacion", "liquidez", "valoracion", "timing", "concentracion"],
    failure: "Falla si los costes de financiación suben, si los permisos se frenan o si los proyectos no alcanzan retornos previstos.",
    controlQuestion: esControlQuestion,
    nextStep: "Diferenciar infraestructura regulada, digital, energética y de transporte.",
  },
  {
    id: "robotics",
    name: "Robótica",
    short: "Máquinas más capaces empiezan a moverse fuera de fábricas hacia logística, salud y servicios.",
    educationalState: "Alta narrativa",
    primaryRisks: ["hype", "timing", "competencia"],
    changing: "Sensores, IA y componentes más baratos amplían lo que los robots pueden hacer en entornos menos controlados.",
    valueChain: "Componentes, sensores, actuadores, software, fabricantes, integradores, mantenimiento y datos.",
    capture: "La captura puede concentrarse en componentes críticos, software, integradores o usuarios que reduzcan costes.",
    vehicles: ["ETF tematico", "accion individual", "empresa privada", "observacion"],
    role: "apuesta",
    bullCase: "La robótica puede resolver escasez laboral y aumentar productividad física.",
    bearCase: "La adopción fuera de entornos controlados puede tardar más de lo que la narrativa sugiere.",
    risks: ["hype", "timing", "competencia", "valoracion", "liquidez"],
    failure: "Falla si la tecnología no alcanza fiabilidad suficiente o si el coste total supera el beneficio operativo.",
    controlQuestion: esControlQuestion,
    nextStep: "Buscar casos de uso con retorno medible, no solo demostraciones llamativas.",
  },
  {
    id: "digital-education",
    name: "Educación digital",
    short: "La formación se vuelve más modular, continua y apoyada por software.",
    educationalState: "Todavía no claro",
    primaryRisks: ["competencia", "liquidez", "timing"],
    changing: "El aprendizaje profesional y escolar adopta plataformas, IA, certificaciones cortas y distribución global.",
    valueChain: "Contenido, plataformas, tutores, certificaciones, herramientas de evaluación, empresas y gobiernos.",
    capture: "Puede capturar valor quien combine distribución, confianza, resultados medibles y coste competitivo.",
    vehicles: ["ETF tematico", "accion individual", "empresa privada", "observacion"],
    role: "todavia no invertible",
    bullCase: "La necesidad de actualización laboral puede sostener demanda continua.",
    bearCase: "La disposición a pagar, la retención y la diferenciación son difíciles.",
    risks: ["competencia", "liquidez", "timing", "valoracion", "hype"],
    failure: "Falla si el producto no mejora resultados, si los costes de captación suben o si el contenido se commoditiza.",
    controlQuestion: esControlQuestion,
    nextStep: "Definir si la hipótesis es educación formal, capacitación corporativa o herramientas para aprender.",
  },
  {
    id: "premium-consumption",
    name: "Consumo premium / aspiracional",
    short: "Marcas, experiencias y estatus siguen capturando gasto en ciertos segmentos.",
    educationalState: "Revisar ciclo",
    primaryRisks: ["valoracion", "concentracion", "timing"],
    changing: "Una parte del consumo global migra hacia marcas, experiencias, viajes y productos con identidad aspiracional.",
    valueChain: "Marcas, distribución, ecommerce, turismo, experiencias, manufactura especializada y comunidades.",
    capture: "Puede capturar valor quien tenga marca fuerte, poder de precio, escasez percibida y distribución directa.",
    vehicles: ["indice amplio", "ETF sectorial", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "Las marcas fuertes pueden proteger márgenes y beneficiarse de consumidores globales de mayor ingreso.",
    bearCase: "El ciclo económico, la saturación y la dependencia de pocas geografías pueden afectar demanda.",
    risks: ["valoracion", "concentracion", "timing", "competencia", "liquidez"],
    failure: "Falla si la marca pierde deseabilidad, si el consumidor aspiracional se debilita o si la valoración exige perfección.",
    controlQuestion: esControlQuestion,
    nextStep: "Mirar si el valor viene de poder de precio real o solo de una historia de marca atractiva.",
  },
];

const enTrends: TrendBaseItem[] = [
  {
    id: "ai",
    name: "Artificial intelligence",
    short: "Models, data and infrastructure are changing how software, content and analysis are produced.",
    educationalState: "Check valuation",
    primaryRisks: ["valoracion", "concentracion", "competencia"],
    changing: "AI is moving cognitive tasks into systems that write, summarize, code, classify and assist decisions.",
    valueChain: "Chips, data centers, power, models, data, application software, integrators and enterprise users.",
    capture: "Value may accrue to infrastructure, dominant platforms, vertical software or companies that lift margins through automation.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada", "infraestructura"],
    role: "satelite",
    bullCase: "Productivity could expand if companies turn AI into savings, new products or better processes.",
    bearCase: "Some value may already be priced in and concentrated among a small group of providers.",
    risks: ["valoracion", "hype", "competencia", "concentracion", "timing"],
    failure: "The hypothesis fails if real usage does not improve margins, regulation raises deployment costs, or competition commoditizes the technology.",
    controlQuestion: enControlQuestion,
    nextStep: "Separate infrastructure, software and enterprise adoption before choosing which layer to observe.",
  },
  {
    id: "automation",
    name: "Automation",
    short: "Industrial, logistics and administrative processes are trying to operate with less manual friction.",
    educationalState: "Analyze vehicle",
    primaryRisks: ["timing", "competencia", "valoracion"],
    changing: "Labor scarcity, cost pressure and digitization are pushing repeatable processes toward automation.",
    valueChain: "Sensors, industrial software, machinery, integrators, maintenance, operating data and end customers.",
    capture: "Value could accrue to firms that lower measurable costs or control critical operating platforms.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "It may improve productivity in sectors with high labor costs or a constant need for precision.",
    bearCase: "Adoption is often slow, cyclical and dependent on capital budgets.",
    risks: ["competencia", "timing", "valoracion", "liquidez"],
    failure: "It fails if customers delay investment, the operating return does not offset complexity, or pricing pressure rises.",
    controlQuestion: enControlQuestion,
    nextStep: "Look for a concrete metric: cost, speed, safety or capacity.",
  },
  {
    id: "energy",
    name: "Energy",
    short: "Electrification, grids, storage and energy security are reshaping capital demand.",
    educationalState: "Watch cycles",
    primaryRisks: ["regulacion", "timing", "valoracion"],
    changing: "Electricity demand is growing through digitization, data centers, electrification and source transitions.",
    valueChain: "Generation, grids, storage, equipment, raw materials, services, efficiency and project finance.",
    capture: "Value may sit in regulated assets, equipment suppliers, infrastructure operators or energy efficiency.",
    vehicles: ["indice amplio", "ETF sectorial", "accion individual", "infraestructura", "observacion"],
    role: "satelite",
    bullCase: "The need for reliable capacity can support investment for years.",
    bearCase: "Returns depend on regulation, permits, commodities and capital-intensive cycles.",
    risks: ["regulacion", "timing", "valoracion", "liquidez", "competencia"],
    failure: "It fails if demand disappoints, incentives change or projects destroy value through overruns.",
    controlQuestion: enControlQuestion,
    nextStep: "Separate structural demand, commodity exposure and regulated infrastructure.",
  },
  {
    id: "longevity",
    name: "Health and longevity",
    short: "Demographics, biotechnology and prevention are changing how care is delivered.",
    educationalState: "Regulatory risk",
    primaryRisks: ["regulacion", "liquidez", "timing"],
    changing: "Aging populations and new therapies are expanding demand for care, diagnostics and prevention.",
    valueChain: "Research, trials, devices, hospitals, insurers, clinical data, distribution and care services.",
    capture: "Value may accrue to companies that prove efficacy, secure reimbursement, scale distribution or control useful data.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada", "observacion"],
    role: "satelite",
    bullCase: "Healthcare demand has demographic support and relatively persistent needs.",
    bearCase: "Many advances fail at trials, approval, pricing or clinical adoption.",
    risks: ["regulacion", "liquidez", "timing", "valoracion", "competencia"],
    failure: "It fails if clinical evidence does not arrive, reimbursement is weak or the product does not fit the healthcare system.",
    controlQuestion: enControlQuestion,
    nextStep: "Separate defensive healthcare, clinical innovation and longevity services.",
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    short: "More digital surface area means more need to protect identity, data and infrastructure.",
    educationalState: "Analyze vehicle",
    primaryRisks: ["competencia", "valoracion", "concentracion"],
    changing: "Cloud, AI, distributed work and more sophisticated attacks are making security a critical function.",
    valueChain: "Identity, endpoints, cloud, network, data, compliance, incident response and managed services.",
    capture: "Platforms with distribution, integration and the ability to reduce operational complexity may capture value.",
    vehicles: ["ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "Spending can be resilient because the cost of a severe breach is high.",
    bearCase: "The sector is competitive and technical advantages can change quickly.",
    risks: ["competencia", "valoracion", "concentracion", "hype", "timing"],
    failure: "It fails if consolidation compresses margins, customers cut duplicate tools, or a platform loses trust.",
    controlQuestion: enControlQuestion,
    nextStep: "Decide whether the hypothesis depends on spending growth, consolidation or a specific technical category.",
  },
  {
    id: "fintech",
    name: "Financial digitization",
    short: "Payments, credit, data and user experience keep moving into digital layers.",
    educationalState: "Regulatory risk",
    primaryRisks: ["regulacion", "competencia", "valoracion"],
    changing: "Financial services are becoming more modular through instant payments, open data and digital distribution.",
    valueChain: "Payments, core banking, fraud, identity, credit, infrastructure, wallets, data and compliance.",
    capture: "Value may sit in networks, low-cost infrastructure, distribution or regulatory software.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "Digitization can reduce friction and expand access through scalable models.",
    bearCase: "Regulation, acquisition costs and bank competition can compress returns.",
    risks: ["regulacion", "competencia", "valoracion", "liquidez", "timing"],
    failure: "It fails if growth requires permanent subsidies, regulatory cost rises or credit losses weaken the model.",
    controlQuestion: enControlQuestion,
    nextStep: "Identify whether the thesis is about infrastructure, distribution, credit or payments.",
  },
  {
    id: "crypto",
    name: "Bitcoin / crypto infrastructure",
    short: "Digital assets and open infrastructure propose a new layer for settlement and custody.",
    educationalState: "High narrative",
    primaryRisks: ["regulacion", "hype", "timing"],
    changing: "Bitcoin, stablecoins, custody and public networks keep the debate around digital money and open financial infrastructure alive.",
    valueChain: "Protocols, custody, exchanges, mining, payments, stablecoins, security, wallets and compliance.",
    capture: "Value may sit not in the protocol that draws attention, but in infrastructure, custody or regulated services.",
    vehicles: ["ETF tematico", "accion individual", "empresa privada", "infraestructura", "observacion"],
    role: "apuesta",
    bullCase: "Institutional adoption and regulated infrastructure could broaden usage and legitimacy.",
    bearCase: "Volatility, regulation and the lack of traditional cash flows make valuation difficult.",
    risks: ["regulacion", "hype", "timing", "liquidez", "concentracion"],
    failure: "It fails if adoption remains narrative-led, regulation limits use cases or operational risk dominates.",
    controlQuestion: enControlQuestion,
    nextStep: "Separate store of value, infrastructure, payments and applications before assigning a role.",
  },
  {
    id: "defense",
    name: "Defense and security",
    short: "Geopolitics, drones, software and resilience are lifting security spending.",
    educationalState: "Watch budgets",
    primaryRisks: ["regulacion", "concentracion", "timing"],
    changing: "Geopolitical tension and military modernization are shifting spending toward sensors, software, drones and critical defense.",
    valueChain: "Contractors, electronics, satellites, cyber defense, logistics, drones, munitions, software and services.",
    capture: "Suppliers with long contracts, scarce capabilities or integration into critical systems may capture value.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "Security budgets can persist when the geopolitical map changes.",
    bearCase: "Spending depends on public policy, procurement cycles and customer concentration.",
    risks: ["regulacion", "concentracion", "timing", "valoracion", "liquidez"],
    failure: "It fails if budgets moderate, programs are delayed or exposure depends on too few contracts.",
    controlQuestion: enControlQuestion,
    nextStep: "Review which spending is structural and which is tied to a specific event.",
  },
  {
    id: "water-food",
    name: "Water and food",
    short: "Scarcity, agricultural productivity and water resilience are becoming more economically important.",
    educationalState: "Observe",
    primaryRisks: ["timing", "regulacion", "liquidez"],
    changing: "Climate, urbanization and food security increase the need for water efficiency and agricultural productivity.",
    valueChain: "Treatment, distribution, irrigation, seeds, fertilizers, machinery, logistics, agricultural data and food.",
    capture: "Value may sit in local infrastructure, efficiency technologies, critical inputs or distribution.",
    vehicles: ["indice amplio", "ETF sectorial", "ETF tematico", "accion individual", "infraestructura", "observacion"],
    role: "satelite",
    bullCase: "These are basic needs with underinvestment in many regions.",
    bearCase: "Public exposure can be indirect and dependent on regulation, weather and agricultural cycles.",
    risks: ["timing", "regulacion", "liquidez", "valoracion", "competencia"],
    failure: "It fails if there is no clear vehicle, margins depend on commodities or regulation limits pricing.",
    controlQuestion: enControlQuestion,
    nextStep: "Separate regulated water, agricultural technology, inputs and food distribution.",
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    short: "Networks, transport, data and energy need renewal and expansion.",
    educationalState: "Analyze vehicle",
    primaryRisks: ["regulacion", "liquidez", "valoracion"],
    changing: "The digital economy and energy transition need power grids, data centers, transport and resilient assets.",
    valueChain: "Operators, builders, concessions, equipment, financing, maintenance, energy and land.",
    capture: "Value may accrue to owners of hard-to-replicate assets, stable contracts or regulated pricing power.",
    vehicles: ["indice amplio", "ETF sectorial", "accion individual", "infraestructura"],
    role: "nucleo",
    bullCase: "It can provide exposure to real assets with long-term demand.",
    bearCase: "Leverage, rates, regulation and project execution can matter heavily.",
    risks: ["regulacion", "liquidez", "valoracion", "timing", "concentracion"],
    failure: "It fails if financing costs rise, permits slow down or projects miss expected returns.",
    controlQuestion: enControlQuestion,
    nextStep: "Differentiate regulated, digital, energy and transport infrastructure.",
  },
  {
    id: "robotics",
    name: "Robotics",
    short: "More capable machines are moving beyond factories into logistics, healthcare and services.",
    educationalState: "High narrative",
    primaryRisks: ["hype", "timing", "competencia"],
    changing: "Sensors, AI and cheaper components are expanding what robots can do in less controlled environments.",
    valueChain: "Components, sensors, actuators, software, manufacturers, integrators, maintenance and data.",
    capture: "Value may concentrate in critical components, software, integrators or users that lower costs.",
    vehicles: ["ETF tematico", "accion individual", "empresa privada", "observacion"],
    role: "apuesta",
    bullCase: "Robotics can address labor shortages and lift physical productivity.",
    bearCase: "Adoption outside controlled environments may take longer than the narrative suggests.",
    risks: ["hype", "timing", "competencia", "valoracion", "liquidez"],
    failure: "It fails if the technology is not reliable enough or total cost exceeds the operating benefit.",
    controlQuestion: enControlQuestion,
    nextStep: "Look for use cases with measurable return, not only impressive demos.",
  },
  {
    id: "digital-education",
    name: "Digital education",
    short: "Learning is becoming more modular, continuous and software-supported.",
    educationalState: "Still unclear",
    primaryRisks: ["competencia", "liquidez", "timing"],
    changing: "Professional and school learning are adopting platforms, AI, short credentials and global distribution.",
    valueChain: "Content, platforms, tutors, credentials, assessment tools, companies and governments.",
    capture: "Value may accrue to players that combine distribution, trust, measurable outcomes and competitive cost.",
    vehicles: ["ETF tematico", "accion individual", "empresa privada", "observacion"],
    role: "todavia no invertible",
    bullCase: "The need for workforce reskilling can support continuous demand.",
    bearCase: "Willingness to pay, retention and differentiation are difficult.",
    risks: ["competencia", "liquidez", "timing", "valoracion", "hype"],
    failure: "It fails if the product does not improve outcomes, acquisition costs rise or content becomes commoditized.",
    controlQuestion: enControlQuestion,
    nextStep: "Define whether the hypothesis is formal education, corporate training or learning tools.",
  },
  {
    id: "premium-consumption",
    name: "Premium / aspirational consumption",
    short: "Brands, experiences and status continue to capture spending in some segments.",
    educationalState: "Check cycle",
    primaryRisks: ["valoracion", "concentracion", "timing"],
    changing: "Part of global consumption is moving toward brands, experiences, travel and products with aspirational identity.",
    valueChain: "Brands, distribution, ecommerce, tourism, experiences, specialized manufacturing and communities.",
    capture: "Value may accrue to companies with strong brands, pricing power, perceived scarcity and direct distribution.",
    vehicles: ["indice amplio", "ETF sectorial", "accion individual", "empresa privada"],
    role: "satelite",
    bullCase: "Strong brands can protect margins and benefit from higher-income global consumers.",
    bearCase: "The economic cycle, saturation and dependence on a few geographies can affect demand.",
    risks: ["valoracion", "concentracion", "timing", "competencia", "liquidez"],
    failure: "It fails if the brand loses desirability, the aspirational consumer weakens or valuation requires perfection.",
    controlQuestion: enControlQuestion,
    nextStep: "Check whether value comes from real pricing power or only an attractive brand story.",
  },
];

const esObservableVehicles: Record<string, TrendObservableVehicle[]> = {
  ai: [
    { ticker: "AIQ", name: "Global X Artificial Intelligence & Technology ETF", kind: "ETF tematico", note: "ETF temático para observar empresas vinculadas a inteligencia artificial, big data e infraestructura tecnológica.", statisticalLevelsSymbol: "AIQ" },
    { ticker: "BOTZ", name: "Global X Robotics & Artificial Intelligence ETF", kind: "ETF tematico", note: "ETF temático para contrastar la capa de robótica, automatización e IA aplicada.", statisticalLevelsSymbol: "BOTZ" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto sectorial líquido para comparar la hipótesis frente a tecnología amplia.", statisticalLevelsSymbol: "XLK" },
    { ticker: "QQQ", name: "Invesco QQQ Trust", kind: "indice amplio", note: "Referencia amplia de crecimiento para estudiar concentración y valoración.", statisticalLevelsSymbol: "QQQ" },
  ],
  automation: [
    { ticker: "ROBO", name: "ROBO Global Robotics and Automation Index ETF", kind: "ETF tematico", note: "ETF temático para observar robótica, automatización industrial y sistemas autónomos." },
    { ticker: "BOTZ", name: "Global X Robotics & Artificial Intelligence ETF", kind: "ETF tematico", note: "Vehículo temático para contrastar automatización con IA y robótica aplicada.", statisticalLevelsSymbol: "BOTZ" },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto sectorial para observar industria, maquinaria e infraestructura operativa.", statisticalLevelsSymbol: "XLI" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto tecnológico para software y semiconductores vinculados a automatización.", statisticalLevelsSymbol: "XLK" },
  ],
  energy: [
    { ticker: "GRID", name: "First Trust NASDAQ Clean Edge Smart Grid Infrastructure Index Fund", kind: "ETF tematico", note: "ETF temático para observar redes eléctricas, equipamiento e infraestructura de electrificación." },
    { ticker: "ICLN", name: "iShares Global Clean Energy ETF", kind: "ETF tematico", note: "Vehículo temático para estudiar energías limpias y transición energética global." },
    { ticker: "XLE", name: "Energy Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto sectorial para energía tradicional y ciclos de commodities.", statisticalLevelsSymbol: "XLE" },
    { ticker: "XLU", name: "Utilities Select Sector SPDR Fund", kind: "infraestructura", note: "Contexto defensivo para redes, utilities y demanda eléctrica regulada.", statisticalLevelsSymbol: "XLU" },
  ],
  longevity: [
    { ticker: "ARKG", name: "ARK Genomic Revolution ETF", kind: "ETF tematico", note: "ETF temático para observar genómica, terapias avanzadas y herramientas de innovación clínica." },
    { ticker: "IBB", name: "iShares Biotechnology ETF", kind: "ETF sectorial", note: "Vehículo dedicado a biotecnología para contrastar la parte clínica de la tesis." },
    { ticker: "XLV", name: "Health Care Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto sectorial para salud amplia sin depender de una sola terapia.", statisticalLevelsSymbol: "XLV" },
  ],
  cybersecurity: [
    { ticker: "CIBR", name: "First Trust NASDAQ Cybersecurity ETF", kind: "ETF dedicado", note: "ETF dedicado a ciberseguridad, identidad, redes y protección digital.", statisticalLevelsSymbol: "CIBR" },
    { ticker: "HACK", name: "Amplify Cybersecurity ETF", kind: "ETF dedicado", note: "Vehículo dedicado para contrastar exposición a proveedores de seguridad informática." },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto tecnológico amplio para comparar software y plataformas.", statisticalLevelsSymbol: "XLK" },
    { ticker: "QQQ", name: "Invesco QQQ Trust", kind: "indice amplio", note: "Referencia amplia para observar dependencia de megacaps tecnológicas.", statisticalLevelsSymbol: "QQQ" },
  ],
  fintech: [
    { ticker: "FINX", name: "Global X FinTech ETF", kind: "ETF dedicado", note: "ETF dedicado para observar pagos, software financiero, crédito digital e infraestructura fintech.", statisticalLevelsSymbol: "FINX" },
    { ticker: "IPAY", name: "Amplify Mobile Payments ETF", kind: "ETF dedicado", note: "Vehículo dedicado para contrastar pagos digitales y redes de procesamiento." },
    { ticker: "XLF", name: "Financial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto sectorial para bancos, pagos, crédito e infraestructura financiera.", statisticalLevelsSymbol: "XLF" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto tecnológico para software, datos y plataformas de pago.", statisticalLevelsSymbol: "XLK" },
  ],
  crypto: [
    { ticker: "IBIT", name: "iShares Bitcoin Trust ETF", kind: "ETF dedicado", note: "Vehículo listado para observar exposición regulada a Bitcoin con historial limitado.", statisticalLevelsSymbol: "IBIT" },
    { ticker: "BTCUSD", name: "Bitcoin / US Dollar", kind: "observacion", note: "Serie observable para estudiar el activo digital como variable de contexto.", statisticalLevelsSymbol: "BTCUSD" },
  ],
  defense: [
    { ticker: "ITA", name: "iShares U.S. Aerospace & Defense ETF", kind: "ETF dedicado", note: "ETF dedicado para observar defensa, aeroespacial y contratistas de seguridad.", statisticalLevelsSymbol: "ITA" },
    { ticker: "PPA", name: "Invesco Aerospace & Defense ETF", kind: "ETF dedicado", note: "Vehículo dedicado alternativo para contrastar exposición a defensa y seguridad." },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto industrial para comparar aeroespacial y contratistas dentro del sector.", statisticalLevelsSymbol: "XLI" },
    { ticker: "SPY", name: "SPDR S&P 500 ETF", kind: "indice amplio", note: "Referencia de mercado para contrastar si la exposición añade concentración.", statisticalLevelsSymbol: "SPY" },
  ],
  "water-food": [
    { ticker: "PHO", name: "Invesco Water Resources ETF", kind: "ETF dedicado", note: "ETF dedicado para observar agua, tratamiento, equipamiento e infraestructura hídrica.", statisticalLevelsSymbol: "PHO" },
    { ticker: "MOO", name: "VanEck Agribusiness ETF", kind: "ETF tematico", note: "Vehículo temático para observar agricultura, insumos y cadenas alimentarias." },
    { ticker: "XLP", name: "Consumer Staples Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto defensivo para alimentos y consumo básico.", statisticalLevelsSymbol: "XLP" },
    { ticker: "XLB", name: "Materials Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto para insumos, químicos y materiales vinculados a agricultura.", statisticalLevelsSymbol: "XLB" },
  ],
  infrastructure: [
    { ticker: "PAVE", name: "Global X U.S. Infrastructure Development ETF", kind: "ETF dedicado", note: "ETF dedicado para observar construcción, materiales, ingeniería e infraestructura estadounidense.", statisticalLevelsSymbol: "PAVE" },
    { ticker: "GRID", name: "First Trust NASDAQ Clean Edge Smart Grid Infrastructure Index Fund", kind: "ETF tematico", note: "Vehículo temático para redes eléctricas e infraestructura de electrificación." },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto sectorial para industria, transporte y construcción.", statisticalLevelsSymbol: "XLI" },
    { ticker: "XLU", name: "Utilities Select Sector SPDR Fund", kind: "infraestructura", note: "Contexto para redes eléctricas y activos regulados.", statisticalLevelsSymbol: "XLU" },
  ],
  robotics: [
    { ticker: "BOTZ", name: "Global X Robotics & Artificial Intelligence ETF", kind: "ETF tematico", note: "ETF temático para observar robótica, automatización e inteligencia artificial aplicada.", statisticalLevelsSymbol: "BOTZ" },
    { ticker: "ROBO", name: "ROBO Global Robotics and Automation Index ETF", kind: "ETF tematico", note: "Vehículo temático alternativo para contrastar robótica industrial y automatización." },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto industrial para automatización física y maquinaria.", statisticalLevelsSymbol: "XLI" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto tecnológico para semiconductores, software y componentes robóticos.", statisticalLevelsSymbol: "XLK" },
  ],
  "digital-education": [
    { ticker: "WCLD", name: "WisdomTree Cloud Computing Fund", kind: "ETF tematico", note: "ETF temático para observar software cloud y plataformas que habilitan educación digital." },
    { ticker: "SKYY", name: "First Trust Cloud Computing ETF", kind: "ETF tematico", note: "Vehículo temático para contrastar infraestructura y servicios cloud." },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto tecnológico para software, plataformas y herramientas digitales.", statisticalLevelsSymbol: "XLK" },
    { ticker: "XLC", name: "Communication Services Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto para distribución digital, contenidos y plataformas de comunicación.", statisticalLevelsSymbol: "XLC" },
  ],
  "premium-consumption": [
    { ticker: "IBUY", name: "Amplify Online Retail ETF", kind: "ETF tematico", note: "ETF temático para observar consumo digital, comercio online y demanda discrecional." },
    { ticker: "XLY", name: "Consumer Discretionary Select Sector SPDR Fund", kind: "ETF sectorial", note: "Contexto sectorial para consumo discrecional y sensibilidad al ciclo.", statisticalLevelsSymbol: "XLY" },
    { ticker: "XLP", name: "Consumer Staples Select Sector SPDR Fund", kind: "ETF sectorial", note: "Referencia defensiva para comparar consumo básico frente a consumo aspiracional.", statisticalLevelsSymbol: "XLP" },
  ],
};

const enObservableVehicles: Record<string, TrendObservableVehicle[]> = {
  ai: [
    { ticker: "AIQ", name: "Global X Artificial Intelligence & Technology ETF", kind: "ETF tematico", note: "Thematic ETF for observing companies tied to artificial intelligence, big data and technology infrastructure.", statisticalLevelsSymbol: "AIQ" },
    { ticker: "BOTZ", name: "Global X Robotics & Artificial Intelligence ETF", kind: "ETF tematico", note: "Thematic ETF for contrasting robotics, automation and applied AI exposure.", statisticalLevelsSymbol: "BOTZ" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Sector context for comparing the hypothesis against broad technology.", statisticalLevelsSymbol: "XLK" },
    { ticker: "QQQ", name: "Invesco QQQ Trust", kind: "indice amplio", note: "Broad growth reference for studying concentration and valuation.", statisticalLevelsSymbol: "QQQ" },
  ],
  automation: [
    { ticker: "ROBO", name: "ROBO Global Robotics and Automation Index ETF", kind: "ETF tematico", note: "Thematic ETF for observing robotics, industrial automation and autonomous systems." },
    { ticker: "BOTZ", name: "Global X Robotics & Artificial Intelligence ETF", kind: "ETF tematico", note: "Thematic vehicle for contrasting automation with applied AI and robotics.", statisticalLevelsSymbol: "BOTZ" },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Sector context for industry, machinery and operating infrastructure.", statisticalLevelsSymbol: "XLI" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Technology context for software and semiconductors linked to automation.", statisticalLevelsSymbol: "XLK" },
  ],
  energy: [
    { ticker: "GRID", name: "First Trust NASDAQ Clean Edge Smart Grid Infrastructure Index Fund", kind: "ETF tematico", note: "Thematic ETF for observing power grids, equipment and electrification infrastructure." },
    { ticker: "ICLN", name: "iShares Global Clean Energy ETF", kind: "ETF tematico", note: "Thematic vehicle for studying clean energy and the global energy transition." },
    { ticker: "XLE", name: "Energy Select Sector SPDR Fund", kind: "ETF sectorial", note: "Sector context for traditional energy and commodity cycles.", statisticalLevelsSymbol: "XLE" },
    { ticker: "XLU", name: "Utilities Select Sector SPDR Fund", kind: "infraestructura", note: "Defensive context for grids, utilities and regulated power demand.", statisticalLevelsSymbol: "XLU" },
  ],
  longevity: [
    { ticker: "ARKG", name: "ARK Genomic Revolution ETF", kind: "ETF tematico", note: "Thematic ETF for observing genomics, advanced therapies and clinical innovation tools." },
    { ticker: "IBB", name: "iShares Biotechnology ETF", kind: "ETF sectorial", note: "Dedicated biotechnology vehicle for contrasting the clinical side of the thesis." },
    { ticker: "XLV", name: "Health Care Select Sector SPDR Fund", kind: "ETF sectorial", note: "Sector context for broad healthcare without relying on one therapy.", statisticalLevelsSymbol: "XLV" },
  ],
  cybersecurity: [
    { ticker: "CIBR", name: "First Trust NASDAQ Cybersecurity ETF", kind: "ETF dedicado", note: "Dedicated ETF for observing cybersecurity, identity, networks and digital protection.", statisticalLevelsSymbol: "CIBR" },
    { ticker: "HACK", name: "Amplify Cybersecurity ETF", kind: "ETF dedicado", note: "Dedicated vehicle for contrasting exposure to information security providers." },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Broad technology context for comparing software and platforms.", statisticalLevelsSymbol: "XLK" },
    { ticker: "QQQ", name: "Invesco QQQ Trust", kind: "indice amplio", note: "Broad reference for observing dependence on technology megacaps.", statisticalLevelsSymbol: "QQQ" },
  ],
  fintech: [
    { ticker: "FINX", name: "Global X FinTech ETF", kind: "ETF dedicado", note: "Dedicated ETF for observing payments, financial software, digital credit and fintech infrastructure.", statisticalLevelsSymbol: "FINX" },
    { ticker: "IPAY", name: "Amplify Mobile Payments ETF", kind: "ETF dedicado", note: "Dedicated vehicle for contrasting digital payments and processing networks." },
    { ticker: "XLF", name: "Financial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Sector context for banks, payments, credit and financial infrastructure.", statisticalLevelsSymbol: "XLF" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Technology context for software, data and payment platforms.", statisticalLevelsSymbol: "XLK" },
  ],
  crypto: [
    { ticker: "IBIT", name: "iShares Bitcoin Trust ETF", kind: "ETF dedicado", note: "Listed vehicle for observing regulated Bitcoin exposure with limited history.", statisticalLevelsSymbol: "IBIT" },
    { ticker: "BTCUSD", name: "Bitcoin / US Dollar", kind: "observacion", note: "Observable series for studying the digital asset as context.", statisticalLevelsSymbol: "BTCUSD" },
  ],
  defense: [
    { ticker: "ITA", name: "iShares U.S. Aerospace & Defense ETF", kind: "ETF dedicado", note: "Dedicated ETF for observing defense, aerospace and security contractors.", statisticalLevelsSymbol: "ITA" },
    { ticker: "PPA", name: "Invesco Aerospace & Defense ETF", kind: "ETF dedicado", note: "Alternative dedicated vehicle for contrasting defense and security exposure." },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Industrial context for comparing aerospace and contractors inside the sector.", statisticalLevelsSymbol: "XLI" },
    { ticker: "SPY", name: "SPDR S&P 500 ETF", kind: "indice amplio", note: "Market reference for checking whether exposure adds concentration.", statisticalLevelsSymbol: "SPY" },
  ],
  "water-food": [
    { ticker: "PHO", name: "Invesco Water Resources ETF", kind: "ETF dedicado", note: "Dedicated ETF for observing water, treatment, equipment and water infrastructure.", statisticalLevelsSymbol: "PHO" },
    { ticker: "MOO", name: "VanEck Agribusiness ETF", kind: "ETF tematico", note: "Thematic vehicle for observing agriculture, inputs and food chains." },
    { ticker: "XLP", name: "Consumer Staples Select Sector SPDR Fund", kind: "ETF sectorial", note: "Defensive context for food and staples.", statisticalLevelsSymbol: "XLP" },
    { ticker: "XLB", name: "Materials Select Sector SPDR Fund", kind: "ETF sectorial", note: "Context for inputs, chemicals and materials linked to agriculture.", statisticalLevelsSymbol: "XLB" },
  ],
  infrastructure: [
    { ticker: "PAVE", name: "Global X U.S. Infrastructure Development ETF", kind: "ETF dedicado", note: "Dedicated ETF for observing construction, materials, engineering and U.S. infrastructure.", statisticalLevelsSymbol: "PAVE" },
    { ticker: "GRID", name: "First Trust NASDAQ Clean Edge Smart Grid Infrastructure Index Fund", kind: "ETF tematico", note: "Thematic vehicle for power grids and electrification infrastructure." },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Sector context for industrials, transport and construction.", statisticalLevelsSymbol: "XLI" },
    { ticker: "XLU", name: "Utilities Select Sector SPDR Fund", kind: "infraestructura", note: "Context for power grids and regulated assets.", statisticalLevelsSymbol: "XLU" },
  ],
  robotics: [
    { ticker: "BOTZ", name: "Global X Robotics & Artificial Intelligence ETF", kind: "ETF tematico", note: "Thematic ETF for observing robotics, automation and applied artificial intelligence.", statisticalLevelsSymbol: "BOTZ" },
    { ticker: "ROBO", name: "ROBO Global Robotics and Automation Index ETF", kind: "ETF tematico", note: "Alternative thematic vehicle for contrasting industrial robotics and automation." },
    { ticker: "XLI", name: "Industrial Select Sector SPDR Fund", kind: "ETF sectorial", note: "Industrial context for physical automation and machinery.", statisticalLevelsSymbol: "XLI" },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Technology context for semiconductors, software and robotics components.", statisticalLevelsSymbol: "XLK" },
  ],
  "digital-education": [
    { ticker: "WCLD", name: "WisdomTree Cloud Computing Fund", kind: "ETF tematico", note: "Thematic ETF for observing cloud software and platforms that enable digital education." },
    { ticker: "SKYY", name: "First Trust Cloud Computing ETF", kind: "ETF tematico", note: "Thematic vehicle for contrasting cloud infrastructure and services." },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", kind: "ETF sectorial", note: "Technology context for software, platforms and digital tools.", statisticalLevelsSymbol: "XLK" },
    { ticker: "XLC", name: "Communication Services Select Sector SPDR Fund", kind: "ETF sectorial", note: "Context for digital distribution, content and communication platforms.", statisticalLevelsSymbol: "XLC" },
  ],
  "premium-consumption": [
    { ticker: "IBUY", name: "Amplify Online Retail ETF", kind: "ETF tematico", note: "Thematic ETF for observing digital consumption, online retail and discretionary demand." },
    { ticker: "XLY", name: "Consumer Discretionary Select Sector SPDR Fund", kind: "ETF sectorial", note: "Sector context for discretionary consumption and cycle sensitivity.", statisticalLevelsSymbol: "XLY" },
    { ticker: "XLP", name: "Consumer Staples Select Sector SPDR Fund", kind: "ETF sectorial", note: "Defensive reference for comparing staples with aspirational consumption.", statisticalLevelsSymbol: "XLP" },
  ],
};

function attachObservableVehicles(trends: TrendBaseItem[], vehicles: Record<string, TrendObservableVehicle[]>): TrendItem[] {
  return trends.map((trend) => ({
    ...trend,
    observableVehicles: vehicles[trend.id] ?? [],
  }));
}

export const trendsContent: Record<Locale, TrendsContent> = {
  es: {
    locale: "es",
    hero: {
      eyebrow: "Nuevas economías",
      title: "Tendencias: del mundo al portafolio",
      subtitle: "Una tendencia no es una inversión. Es apenas el inicio de una hipótesis.",
      text: "Esta sección ayuda a observar cambios tecnológicos, económicos y sociales sin convertirlos automáticamente en recomendaciones. La pregunta no es solo qué está creciendo, sino quién captura valor, con qué vehículo, a qué precio, con qué riesgo y dentro de qué portafolio.",
      badges: ["Nuevas economías", "Hipótesis", "Riesgos", "Vehículos posibles", "Portafolio", "No recomendación"],
      note: "Contenido educativo. No es asesoría financiera, instrucción operativa ni evaluación personalizada.",
    },
    system: {
      eyebrow: "Sistema de decisión",
      title: "Primero estructura, luego oportunidad, después mirada al mundo.",
      intro: "Primero revisamos si tienes estructura. Después practicamos cómo evaluar oportunidades. Luego abrimos la mirada hacia las nuevas economías.",
      items: [
        { label: "Diagnóstico", question: "¿Tengo estructura para invertir?", href: "/diagnostico" },
        { label: "Protección", question: "¿La oportunidad tiene sentido y qué riesgos debo revisar?", href: "/proteccion" },
        { label: "Tendencias", question: "¿Qué está cambiando en el mundo y cómo lo convierto en hipótesis?", href: "/tendencias" },
      ],
    },
    map: {
      eyebrow: "Mapa editorial",
      title: "Tendencias para observar, no para perseguir.",
      intro: "Cada tarjeta resume qué mirar antes de convertir una narrativa en hipótesis educativa. El orden es editorial, no un ranking de atractivo.",
      cta: "Explorar hipótesis",
      selectedLabel: "Detalle de hipótesis",
    },
    detailLabels: {
      changing: "Qué está cambiando",
      valueChain: "Cadena de valor",
      capture: "Quién podría capturar valor",
      vehicles: "Vehículos posibles",
      role: "Rol posible en portafolio",
      bullCase: "Argumento a favor",
      bearCase: "Argumento en contra",
      risks: "Riesgos",
      failure: "Qué tendría que pasar para que la hipótesis falle",
      controlQuestion: "Pregunta de autocontrol",
      nextStep: "Siguiente paso educativo",
    },
    methodology: {
      eyebrow: "De tendencia a hipótesis",
      title: "La historia necesita estructura antes de entrar al portafolio.",
      intro: "Una hipótesis útil no solo explica por qué algo podría funcionar. También dice cómo podría fallar.",
      steps: [
        "Describe el cambio real.",
        "Identifica quién captura valor.",
        "Busca el vehículo, no solo la historia.",
        "Revisa valoración, competencia y regulación.",
        "Define rol: núcleo, satélite, apuesta u observación.",
        "Escribe qué tendría que pasar para que estés equivocado.",
      ],
      closing: "Una tendencia puede ser real y aun así ser mala inversión.",
    },
    sources: {
      eyebrow: "Fuentes posibles",
      title: "Fuentes para observar, no para copiar.",
      intro: "Estas fuentes pueden alimentar curiosidad y contexto. En esta versión no hay APIs, scraping ni automatización.",
      items: [
        { source: "Trend Hunter", note: "Patrones de consumo e innovación. Dar crédito cuando se usen ideas o reportes." },
        { source: "Google Trends", note: "Señal de atención/interés, no predictor de retorno." },
        { source: "DataRoma / superinvestors", note: "Observación de carteras conocidas, no para copiar." },
        { source: "13F / holdings institucionales", note: "Información con retraso, sesgos y limitaciones." },
        { source: "Reportes sectoriales", note: "McKinsey, BCG, Bain, Deloitte y PwC como contexto de industria." },
        { source: "Reportes de mercado", note: "BlackRock, Goldman Sachs, J.P. Morgan y Morgan Stanley como lectura institucional." },
        { source: "CB Insights, Crunchbase, PitchBook", note: "Útiles si hay acceso para mirar empresas privadas y financiación." },
        { source: "FRED, World Bank, IMF, OECD, IEA, Our World in Data", note: "Datos macro, energía, demografía y productividad." },
      ],
      creditNote: "Si una idea concreta se basa en una fuente específica, debe quedar una nota de crédito.",
    },
    tension: {
      title: "Una tendencia puede ser real y aun así ser mala inversión.",
      text: "La realidad del cambio no resuelve por sí sola precio, vehículo, horizonte ni riesgo de concentración.",
      reasons: [
        "Puede estar cara.",
        "Puede no tener vehículo claro.",
        "Puede beneficiar a empresas privadas y no públicas.",
        "Puede estar demasiado descontada.",
        "Puede requerir más horizonte/riesgo del que el usuario tiene.",
        "Puede ser buena narrativa pero mala entrada.",
        "Puede concentrar demasiado el portafolio.",
      ],
    },
    trends: attachObservableVehicles(esTrends, esObservableVehicles),
  },
  en: {
    locale: "en",
    hero: {
      eyebrow: "New economies",
      title: "Trends: from the world to the portfolio",
      subtitle: "A trend is not an investment. It is only the beginning of a hypothesis.",
      text: "This section helps observe technological, economic and social change without turning it automatically into recommendations. The question is not only what is growing, but who captures value, through which vehicle, at what price, with which risk and inside which portfolio.",
      badges: ["New economies", "Hypotheses", "Risks", "Possible vehicles", "Portfolio", "No recommendation"],
      note: "Educational content. Not financial advice, an execution instruction or a personalized assessment.",
    },
    system: {
      eyebrow: "Decision system",
      title: "First structure, then opportunity, then the wider world.",
      intro: "First we check whether you have structure. Then we practice how to evaluate opportunities. Then we widen the lens toward new economies.",
      items: [
        { label: "Diagnostic", question: "Do I have the structure to invest?", href: "/en/diagnostic" },
        { label: "Protection", question: "Does the opportunity make sense and what risks should I review?", href: "/en/protection" },
        { label: "Trends", question: "What is changing in the world and how do I turn it into a hypothesis?", href: "/en/trends" },
      ],
    },
    map: {
      eyebrow: "Editorial map",
      title: "Trends to observe, not chase.",
      intro: "Each card summarizes what to review before turning a narrative into an educational hypothesis. The order is editorial, not a ranking of attractiveness.",
      cta: "Explore hypothesis",
      selectedLabel: "Hypothesis detail",
    },
    detailLabels: {
      changing: "What is changing",
      valueChain: "Value chain",
      capture: "Who could capture value",
      vehicles: "Possible vehicles",
      role: "Possible portfolio role",
      bullCase: "Argument in favor",
      bearCase: "Argument against",
      risks: "Risks",
      failure: "What would make the hypothesis fail",
      controlQuestion: "Self-control question",
      nextStep: "Next educational step",
    },
    methodology: {
      eyebrow: "From trend to hypothesis",
      title: "The story needs structure before entering the portfolio.",
      intro: "A useful hypothesis does not only explain why something might work. It also says how it could fail.",
      steps: [
        "Describe the real change.",
        "Identify who captures value.",
        "Look for the vehicle, not only the story.",
        "Review valuation, competition and regulation.",
        "Define the role: core, satellite, bet or observation.",
        "Write what would have to happen for you to be wrong.",
      ],
      closing: "A trend can be real and still be a poor investment.",
    },
    sources: {
      eyebrow: "Possible sources",
      title: "Sources to observe, not copy.",
      intro: "These sources can feed curiosity and context. This first version does not use APIs, scraping or automation.",
      items: [
        { source: "Trend Hunter", note: "Consumer and innovation patterns. Credit ideas or reports when used." },
        { source: "Google Trends", note: "A signal of attention or interest, not a return predictor." },
        { source: "DataRoma / superinvestors", note: "Observation of known portfolios, not something to copy." },
        { source: "13F / institutional holdings", note: "Delayed information with biases and limitations." },
        { source: "Sector reports", note: "McKinsey, BCG, Bain, Deloitte and PwC for industry context." },
        { source: "Market reports", note: "BlackRock, Goldman Sachs, J.P. Morgan and Morgan Stanley for institutional reads." },
        { source: "CB Insights, Crunchbase, PitchBook", note: "Useful with access for private-company and funding context." },
        { source: "FRED, World Bank, IMF, OECD, IEA, Our World in Data", note: "Macro, energy, demographic and productivity data." },
      ],
      creditNote: "If a concrete idea is based on a specific source, add a credit note.",
    },
    tension: {
      title: "A trend can be real and still be a poor investment.",
      text: "The reality of change does not solve price, vehicle, horizon or concentration risk by itself.",
      reasons: [
        "It may be expensive.",
        "It may lack a clear vehicle.",
        "It may benefit private companies more than public ones.",
        "It may already be priced in.",
        "It may require more horizon or risk than the user has.",
        "It may be a strong narrative but a poor entry.",
        "It may concentrate the portfolio too much.",
      ],
    },
    trends: attachObservableVehicles(enTrends, enObservableVehicles),
  },
};
