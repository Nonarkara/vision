// Browser modules stamp `?v=` so a reload sees a new file. Node's resolver
// treats that query as part of the filename. Tests that import those modules
// strip it here.
export async function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.replace(/\?v=[0-9.]+/, ''), context)
}
