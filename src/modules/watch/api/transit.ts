/**
 * CTA Transit Alerts
 * Surfaces CTA service disruptions that affect student transit during dismissal.
 */

export interface CTAAlert {
  id: string;
  headline: string;
  description: string;
  severity: string;
  impactedService: string;
  eventStart?: string;
  eventEnd?: string;
}

/** Fetch CTA service alerts. Return [] on any failure. */
export async function fetchCTAAlerts(): Promise<CTAAlert[]> {
  try {
    const url = 'https://www.transitchicago.com/api/1.0/alerts.aspx?outputType=JSON';
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json() as {
      CTAAlerts?: {
        Alert?: Array<{
          AlertId: string;
          Headline: string;
          ShortDescription: string;
          SeverityCSS: string;
          ImpactedService?: {
            Service?: Array<{ ServiceName: string }> | { ServiceName: string };
          };
          EventStart?: string;
          EventEnd?: string;
        }>;
      };
    };

    const alerts = data.CTAAlerts?.Alert;
    if (!alerts || !Array.isArray(alerts)) return [];

    return alerts.map(a => {
      let impacted = '';
      const svc = a.ImpactedService?.Service;
      if (Array.isArray(svc)) {
        impacted = svc.map(s => s.ServiceName).join(', ');
      } else if (svc) {
        impacted = svc.ServiceName;
      }

      return {
        id: a.AlertId,
        headline: a.Headline,
        description: a.ShortDescription,
        severity: a.SeverityCSS,
        impactedService: impacted,
        eventStart: a.EventStart,
        eventEnd: a.EventEnd,
      };
    });
  } catch {
    return [];
  }
}
