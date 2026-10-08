"""Research witnesses for scheduling and native satellite units; no runtime hooks."""
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo
from reference_model import finite, instant

BASE=Path(__file__).resolve().parent


def fresh_status(observation_date, as_of, calendar, available_at, certainty='CONSERVATIVE_BOUND'):
    if not calendar or not calendar.get('version') or not calendar.get('coverage_end') or as_of[:10] > calendar['coverage_end']:
        return 'UNKNOWN_CALENDAR'
    if not calendar.get('complete_interval_coverage') and as_of[:10] not in calendar.get('covered_query_dates', []):
        return 'UNKNOWN_CALENDAR'
    try:
        if instant(calendar.get('available_at')) > instant(as_of):
            return 'UNKNOWN_CALENDAR'
    except (ValueError,TypeError):
        return 'UNKNOWN_CALENDAR'
    if certainty not in {'EXACT','CONSERVATIVE_BOUND'}:
        return 'UNKNOWN_AVAILABILITY'
    try:
        eligible=[row['session'] for row in calendar['sessions'] if instant(row['closed_by']) <= instant(as_of)]
        if not eligible or instant(available_at)>instant(as_of):
            return 'NOT_YET_AVAILABLE'
    except (ValueError,TypeError):
        return 'UNKNOWN_AVAILABILITY'
    return 'FRESH' if observation_date==max(eligible) else 'STALE_OR_WRONG_SESSION'


def flow_number(value):
    # Unreported/dash is unknown, not zero; no sum of partial fund cells.
    if value is None or str(value).strip() in {'','-','–','—','N/A'}:
        return None
    text=str(value).strip().replace(',','')
    if text.startswith('(') and text.endswith(')'):
        text='-'+text[1:-1]
    try:
        number=float(text)
        return number if finite(number) else None
    except ValueError:
        return None


def gld_window(rows,n,unit_event=False):
    if unit_event or len(rows)<n+1:
        return None
    a,b=rows[-n-1],rows[-1]
    if any(not finite(row.get(key)) or row[key]<=0 for row in rows[-n-1:] for key in ('shares','nav','aum')):
        return None
    if any(abs(row['nav']*row['shares']-row['aum'])/row['aum']>.01 for row in rows[-n-1:]):
        return None
    delta=b['shares']-a['shares']
    return {'delta_shares':delta,'fraction':delta/a['shares'],'pressure_proxy_usd':delta*b['nav']}


def main():
    # NYSE 2026 published calendar supplies these dates. Close times are session
    # ends only: never publication instants or assumed VIX/CFE close times.
    dates=['2026-03-06','2026-03-09','2026-04-02','2026-04-06','2026-09-04','2026-09-08','2026-11-27']
    schedule={'version':'NYSE_SELECTED_2026_CASES/v1','mode':'SYNTHETIC_CONTRACT_CASES',
              'available_at':'2026-01-01T00:00:00Z',
              'availability_note':'Hypothetical known-at input for a synthetic test; not evidence of when this NYSE calendar was actually captured/published.',
              'complete_interval_coverage':False,'covered_query_dates':['2026-09-06','2026-09-07','2026-09-08','2026-04-03','2026-04-06','2026-03-09','2026-11-27'],
              'coverage_end':'2026-11-27','sessions':[]}
    for date in dates:
        hour=13 if date=='2026-11-27' else 16
        local=dt.datetime.combine(dt.date.fromisoformat(date),dt.time(hour),ZoneInfo('America/New_York'))
        schedule['sessions'].append({'session':date,'closed_by':local.astimezone(dt.timezone.utc).isoformat()})
    cases=[
        ('weekend','2026-09-04','2026-09-06T22:00:00Z','2026-09-04T23:00:00Z','FRESH'),
        ('labor-day','2026-09-04','2026-09-07T22:00:00Z','2026-09-04T23:00:00Z','FRESH'),
        ('next-session-missing','2026-09-04','2026-09-08T22:00:00Z','2026-09-04T23:00:00Z','STALE_OR_WRONG_SESSION'),
        ('good-friday','2026-04-02','2026-04-03T22:00:00Z','2026-04-02T23:00:00Z','FRESH'),
        ('publication-later','2026-04-06','2026-04-06T22:00:00Z','2026-04-07T01:00:00Z','NOT_YET_AVAILABLE'),
        ('before-dst-close','2026-03-06','2026-03-09T19:59:59Z','2026-03-06T23:00:00Z','FRESH'),
        ('after-dst-close','2026-03-06','2026-03-09T20:00:00Z','2026-03-06T23:00:00Z','STALE_OR_WRONG_SESSION'),
        ('early-close','2026-11-27','2026-11-27T18:30:00Z','2026-11-27T18:20:00Z','FRESH'),
    ]
    result=[]
    for name,date,asof,available,expected in cases:
        actual=fresh_status(date,asof,schedule,available)
        result.append({'id':name,'input':{'date':date,'as_of':asof,'available_at':available},'expected':expected,'actual':actual,'pass':actual==expected})
    for name,cal,certainty,expected in [('calendar-missing',None,'CONSERVATIVE_BOUND','UNKNOWN_CALENDAR'),('publication-unknown',schedule,'UNKNOWN','UNKNOWN_AVAILABILITY')]:
        actual=fresh_status('2026-09-04','2026-09-06T22:00:00Z',cal,None,certainty)
        result.append({'id':name,'expected':expected,'actual':actual,'pass':actual==expected})
    for name,asof,cal in [('calendar-outside-covered-cases','2026-04-07T22:00:00Z',schedule),('calendar-version-known-later','2026-09-06T22:00:00Z',dict(schedule,available_at='2026-09-08T22:00:00Z'))]:
        actual=fresh_status('2026-09-04',asof,cal,'2026-09-04T23:00:00Z')
        result.append({'id':name,'expected':'UNKNOWN_CALENDAR','actual':actual,'pass':actual=='UNKNOWN_CALENDAR'})
    for text,expected in [('-',None),('0.0',0.),('(14.7)',-14.7),('1,000.5',1000.5),('NaN',None)]:
        actual=flow_number(text)
        result.append({'id':'native-flow-'+text,'expected':expected,'actual':actual,'pass':actual==expected})
    rows=[{'shares':100+i,'nav':300.,'aum':(100+i)*300.} for i in range(6)]
    actual=gld_window(rows,5)
    result.append({'id':'native-gld-units','expected':{'delta_shares':5,'fraction':.05,'pressure_proxy_usd':1500.},'actual':actual,'pass':actual=={'delta_shares':5,'fraction':.05,'pressure_proxy_usd':1500.}})
    for name,r,n,event in [('gld-insufficient-20',rows,20,False),('gld-unit-event',rows,5,True),('gld-missing-nav',rows[:-1]+[dict(rows[-1],nav=None)],5,False)]:
        actual=gld_window(r,n,event)
        result.append({'id':name,'expected':None,'actual':actual,'pass':actual is None})
    report={'status':'PASS' if all(r['pass'] for r in result) else 'FAIL','checks':result,'calendar_fixture':schedule,
            'calendar_source':'https://www.nyse.com/trade/hours-calendars',
            'scope':'Selected calendar cases, not a complete production calendar; other source calendars remain distinct.'}
    (BASE/'contract-check-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report['status'],len(result),'contract checks')
    assert report['status']=='PASS'


if __name__=='__main__':main()
