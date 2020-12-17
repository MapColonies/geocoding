import { container } from 'tsyringe';
import { ResourceNameManager } from '../../../../src/resourceName/models/resourceNameManager';

let resourceNameManager: ResourceNameManager;

describe('ResourceNameManager', () => {
  beforeAll(function() {
    resourceNameManager = container.resolve(ResourceNameManager);
  });
  describe('#getResource', () => {
    it('return the resource of id 1', function() {
      // action
      const resource = resourceNameManager.getResource();

      // expectation
      expect(resource.id).toEqual(1);
      expect(resource.name).toEqual('ronin');
      expect(resource.description).toEqual('can you do a logistics run?');
    });
  });
});
