import { AAS, RDSDesignation, UNSNode } from '@/types/industrial';
import { resolveUNSPath } from './hierarchyUtils';
import { validateIdShort } from './validation';
import { STRUCTURE_PROP } from './aasElements';

export function getAssetOverview(aas: AAS, nodes: UNSNode[], designations: RDSDesignation[]) {
  const node = nodes.find(n => n.id === aas.linkedUNSNodeId);
  const rds = designations.find(r => r.id === aas.linkedRDSId);
  const properties = aas.submodels.flatMap(s => s.properties).filter(p => p.idShort !== STRUCTURE_PROP);
  const issues: string[] = [];
  if (!aas.isType && !node) issues.push('UNS location is not linked or unavailable.');
  if (!aas.isType && !rds) issues.push('RDS designation is not linked or unavailable.');
  if (!aas.submodels.length) issues.push('No submodels are stored on this asset.');
  const missingValues = properties.filter(p => p.value == null || p.value === '').length;
  if (missingValues) issues.push(`${missingValues} stored properties have no value.`);
  if (!validateIdShort(aas.idShort).valid) issues.push('AAS idShort does not meet the shared syntax rule.');
  if (rds && rds.linkedAASId !== aas.id) issues.push('The RDS link does not point back to this asset.');
  if (rds && rds.linkedUNSNodeId !== aas.linkedUNSNodeId) issues.push('AAS and RDS location links differ.');
  return { node, rds, path: node ? resolveUNSPath(node, nodes) : undefined, properties, missingValues, issues };
}