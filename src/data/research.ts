export interface ResearchFinding {
  id: string;
  title: string;
  source: string;
  dateRange: string;
  summary: string;
  tags: string[];
  link?: string;
}

export const academicResearch: ResearchFinding[] = [
  {
    id: "world-bank-jobs-2026",
    title: "Running Faster, for Longer: Structural Transformation and Good Jobs",
    source: "World Bank",
    dateRange: "2020-2026",
    summary: "Highlights that while the economy absorbs new entrants, job creation remains skewed toward low-value sectors. Notes real wage stagnation and emphasizes a 'jobs-centered growth strategy' requiring regulatory reform to formalize the labor market.",
    tags: ["World Bank", "Job Quality", "Wage Stagnation", "Youth Unemployment", "Macroeconomic"],
    link: "https://data.worldbank.org/"
  },
  {
    id: "ilo-trends-2026",
    title: "Employment and Social Trends 2026 & Pandemic Recovery",
    source: "ILO",
    dateRange: "2020-2026",
    summary: "Documents the severe disruption during 2020-2021 and subsequent recovery. Despite unemployment dropping to historic lows (approx. 4.68% in 2026), challenges persist regarding job quality, informal sector dominance, and securing decent work.",
    tags: ["ILO", "Pandemic Recovery", "Unemployment Rate", "Informal Sector", "Decent Work"],
    link: "https://ilostat.ilo.org/"
  },
  {
    id: "prospera-recovery",
    title: "Pandemic Recovery & Inclusive Economic Growth",
    source: "Prospera",
    dateRange: "2020-2026",
    summary: "Advisory work focusing heavily on pandemic recovery, private sector development, and productivity reforms. Emphasizes technical assistance on regulatory support and digital economy frameworks to boost overall labor market efficiency.",
    tags: ["Prospera", "Economic Reform", "Digital Economy", "Private Sector"],
  },
  {
    id: "gig-economy-buffer",
    title: "Gig Economy: Employment Buffer vs. Pseudo-Autonomy",
    source: "Various (Kemnaker, Academic Journals)",
    dateRange: "2020-2026",
    summary: "The gig economy absorbed up to 59% of the workforce mid-2020s. While acting as a vital safety net, workers face 'pseudo-autonomy'—enjoying schedule flexibility but lacking minimum wage, social security, and facing algorithmic control.",
    tags: ["Gig Economy", "Digital Economy", "Informality", "Social Security"],
  },
  {
    id: "smk-mismatch",
    title: "Skills Mismatch & Vocational High School (SMK) Unemployment",
    source: "Local Agencies (SMERU, Universities)",
    dateRange: "2020-2026",
    summary: "SMK graduates consistently represent the highest Open Unemployment Rate demographic. The root causes include overly theoretical curricula, weak industry partnerships (DUDI), and soft skills deficits. Calls for deeper curriculum-industry synchronization beyond just mass certifications.",
    tags: ["Pengangguran SMK", "Skills Mismatch", "Youth Employment", "Link and Match"],
  },
  {
    id: "green-jobs-transition",
    title: "Green Jobs & Labor Market Transition",
    source: "National Development Plans & Energy Think Tanks",
    dateRange: "2020-2026",
    summary: "Indonesia's push toward net-zero emissions has spurred job creation in renewable energy and EVs. However, a significant 'green' skills gap remains. Emphasizes the need for a 'just transition' to reskill workers currently tied to fossil-fuel industries.",
    tags: ["Green Jobs", "Energy Transition", "Just Transition", "Reskilling"],
  },
  {
    id: "time-use-overwork",
    title: "Time Use, Working Hours & The Overwork Paradox",
    source: "BPS Sakernas & LPEM FEB UI",
    dateRange: "2020-2026",
    summary: "Over 25% of the workforce works >49 hours/week, driven by the 'low wage-long hour' trap rather than workaholism. Informal workers often log 12-15 hour days for subsistence earnings. This leads to fatigue and ironically lowers overall hourly productivity.",
    tags: ["Working Hours", "Time Use", "Overwork", "Productivity Paradox", "Low Wage"],
  }
];
