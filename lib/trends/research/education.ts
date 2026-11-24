import type { Chain, Locale, Measure, Source } from "./types";

// Verified supplement to the supplied research; the original snapshot remains intact.
const urls = {
  EDU_SANTANDER_COURSERA: "https://www.santander.com/es/sala-de-comunicacion/notas-de-prensa/2026/09/santander-y-coursera-ofrecen-100000-plazas-de-formacion-gratuita-en-ia-datos-o-liderazgo-ante-la-transformacion-del-mercado-laboral",
  EDU_SANTANDER_ACCESS: "https://www.santanderopenacademy.com/es/faq.html",
  EDU_COURSERA_PARTNERS: "https://www.sec.gov/Archives/edgar/data/1651562/000165156226000015/cour-20251231.htm",
  EDU_GOOGLE_ACCESS: "https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/google-data-centers-ai-skills-investments/",
  EDU_COURSERA_EXCHANGE: "https://www.sec.gov/Archives/edgar/data/1651562/000114036126020399/ef20072971_8k.htm",
};
const titles = {
  es: ["Santander y Coursera · Skills for Work, septiembre 2026", "Santander Open Academy · financiación y acceso gratuito", "Coursera · contratos con universidades y creadores, 10-K 2025", "Google.org · AI Opportunity Fund, anuncio de abril 2024", "Coursera · cierre y relación de canje con Udemy, 8-K mayo 2026"],
  en: ["Santander and Coursera · Skills for Work, September 2026", "Santander Open Academy · funding and free access", "Coursera · university and creator contracts, 2025 10-K", "Google.org · AI Opportunity Fund, April 2024 announcement", "Coursera · Udemy closing and exchange ratio, May 2026 8-K"],
};
export function educationSources(locale: Locale): Record<string, Source> {
  return Object.fromEntries(Object.entries(urls).map(([id,url],i) => [id,{title:titles[locale][i],url}]));
}
export const educationSourceIds = Object.keys(urls);
export function educationChain(base: Chain, locale: Locale): Chain {
  return {
    ...base,
    nodes: [...base.nodes, {
      id:"access-funding", label:locale === "es" ? "Becas y formación financiada" : "Scholarships and funded training",
      actors:["Banco Santander", "Google.org"],
    }, {
      id:"content-partners", label:locale === "es" ? "Universidades y creadores" : "Universities and content creators",
    }],
    edges: [...base.edges,
      {source:"access-funding",target:"n3",label:locale === "es" ? "Licencias, plazas y ayudas de acceso" : "Licences, places and access grants",kind:"funding"},
      {source:"content-partners",target:"n2",label:locale === "es" ? "Desarrollo y licencia de contenidos" : "Content creation and licensing"},
    ],
  };
}
export type EducationAccessProgram = {
  actor: string; program: string; measure: Measure; description: string; limitation: string; sources: string[];
};
export function educationPrograms(locale: Locale): EducationAccessProgram[] {
  return locale === "es" ? [{
    actor:"Banco Santander",program:"Skills for Work · Coursera",
    measure:{value:100000,unit:"plazas anunciadas",period:"2026 · anuncio del 3 de septiembre",kind:"oferta anunciada"},
    description:"50.000 plazas nuevas se suman a 50.000 asignadas en agosto. Acceso a 80 cursos durante 12 meses, sin coste para las personas seleccionadas.",
    limitation:"Son plazas de formación, no euros invertidos ni alumnos que hayan completado un curso. La convocatoria tiene requisitos; no exige ser cliente ni tener título universitario.",
    sources:["EDU_SANTANDER_COURSERA","EDU_SANTANDER_ACCESS"],
  },{
    actor:"Google.org",program:"AI Opportunity Fund · EE. UU.",
    measure:{value:75,unit:"millones USD",period:"26 abril 2024",kind:"fondo anunciado"},
    description:"Financia acceso a habilidades de IA mediante entidades como Goodwill e IVMF. El objetivo anunciado es formar a un millón de personas en EE. UU. sin coste para ellas.",
    limitation:"Es una dotación anunciada y un objetivo, no gasto ejecutado ni formación completada. No atribuyo todo el fondo a Coursera ni a universidades.",
    sources:["EDU_GOOGLE_ACCESS"],
  }] : [{
    actor:"Banco Santander",program:"Skills for Work · Coursera",
    measure:{value:100000,unit:"announced places",period:"2026 · September 3 announcement",kind:"announced offer"},
    description:"50,000 new places join 50,000 allocated in August. Selected learners receive free access to 80 courses for 12 months.",
    limitation:"These are training places, not invested euros or completed courses. Eligibility rules apply; neither a bank account nor a university degree is required.",
    sources:["EDU_SANTANDER_COURSERA","EDU_SANTANDER_ACCESS"],
  },{
    actor:"Google.org",program:"AI Opportunity Fund · United States",
    measure:{value:75,unit:"million USD",period:"April 26, 2024",kind:"announced fund"},
    description:"Funds access to AI skills through organisations such as Goodwill and IVMF. The announced target is free training for one million people in the United States.",
    limitation:"An announced allocation and target, not expenditure or completed training. I do not attribute the entire fund to Coursera or universities.",
    sources:["EDU_GOOGLE_ACCESS"],
  }];
}
export const educationFundingCopy = {
  es: {
    chainTitle:"Quién paga y quién recibe",
    intro:"El alumno no siempre es quien paga. Empresas y fundaciones pueden financiar el acceso mediante becas, licencias o ayudas. Santander y Coursera colaboran; esa relación no convierte a Coursera en filial del banco.",
    contracts:"Coursera remunera a proveedores de contenidos según sus contratos. En los títulos universitarios, el alumno contrata con la universidad y Coursera cobra una comisión de servicio. El modelo cambia según el producto. Las fuentes citadas no desglosan el reparto del acuerdo con Santander.",
    roles:[
      ["Financiador", "Santander / Google.org", "Plazas, licencias o ayudas para facilitar el acceso."],
      ["Plataforma", "Coursera y otros distribuidores", "Acceso, tecnología y distribución; el contrato determina cómo se remunera al proveedor."],
      ["Contenido y credenciales", "Universidades y otros creadores", "Producen formación y pueden recibir pagos; el modelo depende del producto."],
    ],
    fundingTitle:"Capital que facilita el acceso",fundingIntro:"Estos programas financian formación. Los distingo de comprar acciones de una empresa educativa.",
    headers:["Función", "Participantes", "Relación económica"], table:"Programas de acceso financiado",program:"Programa",scale:"Escala y naturaleza",period:"Periodo",limit:"Alcance y límite",sources:"Fuentes",
    casesTitle:"Tenencias declaradas y operaciones corporativas",position:"Tenencia declarada · 13F",passive:"La gestión del SNB es pasiva. El aumento no demuestra una apuesta educativa ni dinero entregado a Duolingo.",
    exchange:"Canje de acciones",missing:"La fuente citada no aporta un importe monetario.",
  },
  en: {
    chainTitle:"Who pays and who receives",
    intro:"The learner is not always the payer. Companies and foundations can fund access through scholarships, licences or grants. Santander and Coursera collaborate; that relationship does not make Coursera a bank subsidiary.",
    contracts:"Coursera pays content providers under their contracts. For university degrees, learners contract with the university and Coursera receives a service fee. Payment structures differ by product; no allocation of the Santander agreement is disclosed here.",
    roles:[
      ["Funder", "Santander / Google.org", "Places, licences or grants that support access."],
      ["Platform", "Coursera and other distributors", "Access, technology and distribution; provider compensation depends on the contract."],
      ["Content and credentials", "Universities and other creators", "Produce training and may receive payments; the model varies by product."],
    ],
    fundingTitle:"Capital that enables access",fundingIntro:"These programmes finance training. They are distinct from buying shares in an education company.",
    headers:["Role", "Participants", "Economic relationship"],table:"Funded access programmes",program:"Programme",scale:"Scale and nature",period:"Period",limit:"Scope and limitation",sources:"Sources",
    casesTitle:"Disclosed holdings and corporate transactions",position:"Disclosed holding · 13F",passive:"The SNB manages equities passively. The increase does not establish an education bet or funding delivered to Duolingo.",
    exchange:"Share exchange",missing:"The cited source does not provide a monetary amount.",
  },
} as const;
