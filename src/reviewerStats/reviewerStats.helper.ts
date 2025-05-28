import { Color, ScaleType } from '@swimlane/ngx-charts';
import { GitRepository } from '../azure-devops.service';

export const colorScheme: Color = {
  name: 'customScheme',
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA'],
};

export function sortReposCustomOrder(repos: GitRepository[]): GitRepository[] {
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
