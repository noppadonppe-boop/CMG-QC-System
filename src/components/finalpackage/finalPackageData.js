import {
  getTagOptionGroupKey,
  splitTagIds,
  TAG_SYNC_GROUPS,
} from '../rfi/RfiTagOptions';

const CLOSED_STATUSES = new Set([
  'rfi closed',
  'closed',
  'close',
]);
const ISSUE_RESULTS = new Set(['reject', 'rejected', 'fail', 'failed']);

export const CI_GROUP_RECORD_TYPE = 'ci-group';
export const CI_RFI_LINK_RECORD_TYPE = 'ci-rfi-link';

export function normalizeTagId(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function uniqueText(values) {
  const byKey = new Map();
  values.forEach((value) => {
    const text = String(value || '').trim();
    const key = text.toLocaleLowerCase();
    if (text && !byKey.has(key)) byKey.set(key, text);
  });
  return [...byKey.values()];
}

function summarize(values) {
  const all = uniqueText(values);
  return {
    all,
    display: all.length > 1 ? `${all[0]} +${all.length - 1}` : (all[0] || '—'),
    title: all.join('\n'),
  };
}

function normalizeStatus(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

export function isRfiClosed(rfi) {
  return CLOSED_STATUSES.has(normalizeStatus(rfi?.stage4Status)) ||
    CLOSED_STATUSES.has(normalizeStatus(rfi?.statusDoc));
}

export function getRfiSignatureSteps(rfi) {
  return [
    rfi?.stage4ClientSignFiles,
    rfi?.stage4CompleteFiles,
    rfi?.stage4OwnerSignFiles,
  ].filter(files => Array.isArray(files) && files.length > 0).length;
}

export function getRfiRevision(rfi) {
  const history = Array.isArray(rfi?.revisionHistory) ? rfi.revisionHistory : [];
  const latestHistoryRevision = history.reduce(
    (latest, item) => Math.max(latest, Number(item?.revNo) || 0),
    0,
  );
  return Number(rfi?.currentRevisionNo) || latestHistoryRevision || 1;
}

export function getRfiDisplayStatus(rfi) {
  return rfi?.stage4Status || rfi?.statusDoc || rfi?.statusInsp || `Stage ${rfi?.stage || 1}`;
}

export function getRfiDisplayNo(rfi) {
  return (rfi?.rfiNo && rfi.rfiNo !== '-') ? rfi.rfiNo : (rfi?.requestNo || '—');
}

export function getRfiShortNo(rfi) {
  const fullNo = getRfiDisplayNo(rfi);
  if (!fullNo || fullNo === '—') return '—';

  const match = /(\d+)$/.exec(String(fullNo).trim());
  if (match) {
    const digits = match[1];
    const padded = digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '0');
    return `RFI-${padded}`;
  }

  return fullNo;
}

function getTagStatus(rfis) {
  const hasIssue = rfis.some(rfi => [
    rfi.stage4Result,
    rfi.result,
    rfi.statusInsp,
  ].some(value => ISSUE_RESULTS.has(normalizeStatus(value))));

  if (hasIssue) return 'attention';
  if (rfis.length > 0 && rfis.every(isRfiClosed)) return 'completed';
  if (rfis.some(rfi => Number(rfi.stage) > 1)) return 'in-progress';
  return 'pending';
}

function getTagGroupLabels(groupKey, options) {
  const configuredGroup = TAG_SYNC_GROUPS.find(group => group.key === groupKey);
  if (configuredGroup) return [configuredGroup.label];

  if (groupKey) {
    const matchedLabels = options
      .filter(option => getTagOptionGroupKey(option) === groupKey)
      .map(option => option.syncGroupLabel)
      .filter(Boolean);
    return matchedLabels.length > 0 ? matchedLabels : [groupKey];
  }

  return options
    .map((option) => (
      option.syncGroupLabel ||
      TAG_SYNC_GROUPS.find(group => group.key === getTagOptionGroupKey(option))?.label ||
      ''
    ))
    .filter(Boolean);
}

/**
 * Build a live TAG -> RFI master/detail view without copying RFI data to a
 * second Firestore collection. A TAG is case-insensitive for grouping, while
 * the first source spelling is kept as its display label.
 */
export function buildTagRfiGroups(rfiItems = [], tagOptions = [], projectId = '') {
  const optionsByTag = new Map();

  tagOptions
    .filter(option => (
      option.projectId === projectId &&
      option.field === 'tagNo' &&
      option.active !== false
    ))
    .forEach((option) => {
      const key = normalizeTagId(option.value);
      if (!key) return;
      if (!optionsByTag.has(key)) optionsByTag.set(key, []);
      optionsByTag.get(key).push(option);
    });

  const grouped = new Map();

  rfiItems
    .filter(rfi => rfi.projectId === projectId)
    .forEach((rfi) => {
      const seenInRfi = new Set();

      splitTagIds(rfi.tagNo).forEach((rawTagId) => {
        const key = normalizeTagId(rawTagId);
        if (!key || seenInRfi.has(key)) return;
        seenInRfi.add(key);

        if (!grouped.has(key)) {
          grouped.set(key, {
            key,
            tagId: String(rawTagId).trim(),
            rfis: [],
          });
        }
        grouped.get(key).rfis.push(rfi);
      });
    });

  return [...grouped.values()]
    .map((group) => {
      const options = optionsByTag.get(group.key) || [];
      const groupLabels = group.rfis.flatMap(rfi => getTagGroupLabels(rfi.tagGroupKey, options));
      const explicitSystems = group.rfis.map(rfi => rfi.system).filter(Boolean);
      const signatureSteps = group.rfis.reduce((sum, rfi) => sum + getRfiSignatureSteps(rfi), 0);
      const maxSignatureSteps = group.rfis.length * 3;

      return {
        ...group,
        status: getTagStatus(group.rfis),
        description: summarize(group.rfis.map(rfi => (
          rfi.tagDescription ||
          rfi.descriptionOfInspection ||
          rfi.detailInspection ||
          rfi.typeOfInspection
        ))),
        system: summarize(explicitSystems.length > 0 ? explicitSystems : groupLabels),
        subSystem: summarize(group.rfis.map(rfi => rfi.subSystem || rfi.structureType)),
        workArea: summarize(group.rfis.map(rfi => rfi.workArea || rfi.area)),
        location: summarize(group.rfis.map(rfi => [
          rfi.unit || rfi.unitNo,
          rfi.location,
          rfi.workArea || rfi.area,
        ].filter(Boolean).join(' / '))),
        workingStep: summarize(group.rfis.map(rfi => rfi.workingStep)),
        signatureSteps,
        maxSignatureSteps,
        documentProgress: maxSignatureSteps > 0
          ? Math.round((signatureSteps / maxSignatureSteps) * 100)
          : 0,
      };
    })
    .sort((a, b) => a.tagId.localeCompare(b.tagId, undefined, {
      numeric: true,
      sensitivity: 'base',
    }));
}

function encodeDocumentTuple(parts) {
  return encodeURIComponent(JSON.stringify(
    parts.map(value => String(value || '').trim()),
  ));
}

function getCiNumber(code) {
  const match = /^CI-(\d+)$/i.exec(String(code || '').trim());
  return match ? Number(match[1]) : null;
}

export function getCiGroups(finalPackageItems = [], projectId = '') {
  return finalPackageItems
    .filter(item => (
      item.projectId === projectId &&
      item.recordType === CI_GROUP_RECORD_TYPE &&
      item.active !== false
    ))
    .sort((a, b) => {
      const aOrder = Number(a.sortOrder) || getCiNumber(a.code) || Number.MAX_SAFE_INTEGER;
      const bOrder = Number(b.sortOrder) || getCiNumber(b.code) || Number.MAX_SAFE_INTEGER;
      const byOrder = aOrder - bOrder;
      if (byOrder !== 0) return byOrder;
      return String(a.code || '').localeCompare(String(b.code || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
}

export function getNextCiCode(ciGroups = []) {
  const maxNumber = ciGroups.reduce(
    (max, group) => Math.max(max, getCiNumber(group.code) || 0),
    0,
  );
  return `CI-${String(maxNumber + 1).padStart(3, '0')}`;
}

export function buildCiGroupId(projectId, code) {
  return `ci-group__${encodeDocumentTuple([
    projectId,
    String(code || '').toLocaleLowerCase(),
  ])}`;
}

export function buildCiRfiLinkId(projectId, rfiId, ciGroupId) {
  return `ci-rfi-link__${encodeDocumentTuple([projectId, rfiId, ciGroupId])}`;
}

export function getCiRfiLinks(finalPackageItems = [], projectId = '') {
  return finalPackageItems.filter(item => (
    item.projectId === projectId &&
    item.recordType === CI_RFI_LINK_RECORD_TYPE &&
    item.active !== false &&
    item.rfiId &&
    item.ciGroupId
  ));
}

export function getCiRfiLinkKey(rfiId, ciGroupId) {
  return `${String(rfiId || '')}::${String(ciGroupId || '')}`;
}

export function buildCiRfiLinkMap(links = []) {
  return new Map(links.map(link => [getCiRfiLinkKey(link.rfiId, link.ciGroupId), link]));
}
