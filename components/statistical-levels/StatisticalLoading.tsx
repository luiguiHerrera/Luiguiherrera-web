import { StatisticalPageHeading } from './StatisticalPageHeading';
import './statistical-levels.css';
import './statistical-levels-editorial.css';
import './statistical-loading.css';

function Line({ size = 'medium' }: { size?: 'short' | 'medium' | 'long' }) {
  return <span className={`sl-loading-line sl-loading-line-${size}`} />;
}

export function StatisticalLoading({ locale = 'es', modulesOnly = false }: { locale?: 'es' | 'en'; modulesOnly?: boolean }) {
  const en = locale === 'en';
  return <div className={modulesOnly ? 'sl-loading-modules' : 'sl-page sl-loading-page'} data-statistical-loading aria-busy="true" aria-label={en ? 'Loading quantitative analysis' : 'Cargando análisis cuantitativo'}>
    {!modulesOnly ? <>
      <StatisticalPageHeading locale={locale} />
      <p className="sl-loading-status" role="status">{en ? 'Loading quantitative analysis…' : 'Cargando análisis cuantitativo…'}</p>
      <div className="sl-loading-controls sl-loading-surface" aria-hidden="true">
        {[0, 1, 2].map(i => <div key={i}><Line size="short" /><span className="sl-loading-input" /></div>)}
      </div>
    </> : null}
    <div className="sl-loading-overview sl-loading-surface" aria-hidden="true">
      {[0, 1, 2, 3].map(i => <div key={i}><Line size="short" /><span className="sl-loading-number" /><Line /></div>)}
    </div>
    <div className="sl-loading-observation sl-loading-surface" aria-hidden="true"><Line size="short" /><span className="sl-loading-title" /><Line size="long" /><Line /></div>
    <div className="sl-loading-chart sl-loading-surface" aria-hidden="true">
      <span className="sl-loading-title" />
      <div className="sl-loading-axis"><span /><span /><span /><span /></div>
      <div className="sl-loading-columns">{[0, 1, 2, 3].map(i => <div key={i}><Line /><span className="sl-loading-number" /></div>)}</div>
    </div>
    <div className="sl-loading-metrics sl-loading-surface" aria-hidden="true">
      {[0, 1, 2].map(i => <div key={i}><Line size="short" /><span className="sl-loading-number" /><Line size="long" /><Line /></div>)}
    </div>
  </div>;
}
