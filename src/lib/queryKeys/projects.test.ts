/**
 * Tests for projectsKeys — structural validation
 */
import { describe, it, expect } from 'vitest';
import { projectsKeys } from './projects';

describe('projectsKeys', () => {
  it('exposes prefix helpers for invalidation', () => {
    expect(projectsKeys.allPrefix()).toEqual(['projects']);
    expect(projectsKeys.listPrefix()).toEqual(['projects', 'list']);
    expect(projectsKeys.milestonesPrefix()).toEqual(['projects', 'milestones']);
  });

  it('list includes buId and optional filters', () => {
    expect(projectsKeys.list('bu-1')).toEqual(['projects', 'list', 'bu-1', undefined]);
    expect(projectsKeys.list('bu-1', { status: ['active'] } as any)).toEqual([
      'projects',
      'list',
      'bu-1',
      { status: ['active'] },
    ]);
  });

  it('detail keys are unique per id and BU-scoped', () => {
    expect(projectsKeys.detail('p1')).not.toEqual(projectsKeys.detail('p2'));
    expect(projectsKeys.detail('p1', 'bu-1')).toEqual(['projects', 'detail', 'p1', 'bu-1']);
    expect(projectsKeys.detail('p1')).toEqual(['projects', 'detail', 'p1', null]);
  });

  it('byKr / forWizard / milestones build expected shapes', () => {
    expect(projectsKeys.byKr('kr-1')).toEqual(['projects', 'by-kr', 'kr-1']);
    expect(projectsKeys.forWizard('bu-1', 'team-9')).toEqual(['projects', 'wizard', 'bu-1', 'team-9']);
    expect(projectsKeys.milestones('p1')).toEqual(['projects', 'milestones', 'p1', null]);
    expect(projectsKeys.milestones('p1', 'bu-1')).toEqual(['projects', 'milestones', 'p1', 'bu-1']);
    expect(projectsKeys.detailFor('p1')).toEqual(['projects', 'detail', 'p1']);
    expect(projectsKeys.milestonesFor('p1')).toEqual(['projects', 'milestones', 'p1']);
  });

  it('myProjects/myMilestones include profileId', () => {
    expect(projectsKeys.myProjects('bu-1', 'prof-1')).toEqual(['projects', 'my', 'bu-1', 'prof-1']);
    expect(projectsKeys.myMilestones('bu-1', null)).toEqual(['projects', 'my-milestones', 'bu-1', null]);
  });

  it('linking helpers are namespaced', () => {
    expect(projectsKeys.krsForLinking('bu-1')[1]).toBe('krs-for-linking');
    expect(projectsKeys.projectsForLinking('bu-1')[1]).toBe('projects-for-linking');
    expect(projectsKeys.milestoneKrs('m1')).toEqual(['projects', 'milestone-krs', 'm1']);
    expect(projectsKeys.milestoneKrsByKr('kr1')).toEqual(['projects', 'milestone-krs-by-kr', 'kr1']);
  });

  it('comments / commentAttachments scoped to projectId', () => {
    expect(projectsKeys.comments('p1')).toEqual(['projects', 'comments', 'p1']);
    expect(projectsKeys.commentAttachments('p1')).toEqual(['projects', 'comment-attachments', 'p1']);
  });
});
