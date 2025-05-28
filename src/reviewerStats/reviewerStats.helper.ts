import { Color, ScaleType } from '@swimlane/ngx-charts';
import { GitRepository, PullRequest } from '../azure-devops.service';

export const colorScheme: Color = {
  name: 'customScheme',
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA'],
};

export function sortReposCustomOrder(repos: GitRepository[]): GitRepository[] {
  // TODO JWK: should be configurable
  const customOrder = [
    'ProductionCenter.WebAPI',
    'ProductionCenter.Frontend',
    'ProductionCenter.TrayApp',
    'ProductionCenter.WorkflowTests.Data',
  ];
  // Sort: customOrder first, then the rest alphabetically
  return repos.sort((a, b) => {
    const aIdx = customOrder.indexOf(a.name);
    const bIdx = customOrder.indexOf(b.name);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function filterStatsByDevTest(
  reviewerPRs: Record<string, PullRequest[]>,
  devTestPhrase: string
): Record<string, number> {
  const filteredStats: Record<string, number> = {};
  for (const [reviewer, prs] of Object.entries(reviewerPRs)) {
    const filteredPRs = prs.filter(
      (pr) => !pr.title.toLowerCase().includes(devTestPhrase)
    );
    if (filteredPRs.length > 0) {
      filteredStats[reviewer] = filteredPRs.length;
    }
  }
  return Object.fromEntries(
    Object.entries(filteredStats).sort(([, a], [, b]) => b - a)
  );
}
