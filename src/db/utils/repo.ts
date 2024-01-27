import { ObjectLiteral, EntityTarget, Repository } from 'typeorm'

import { dataSource } from '../data-source'

const cache = new Map<EntityTarget<ObjectLiteral>, Repository<any>>()

export function getRepo<T extends ObjectLiteral>(
  target: EntityTarget<T>
): Repository<T> {
  let repo = cache.get(target)

  if (!repo) {
    repo = dataSource.getRepository(target)
    cache.set(target, repo)
  }

  return repo
}
