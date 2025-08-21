// Enforces using notify() facade instead of direct sonner toast calls.
module.exports = {
  meta: { type:'problem', docs:{ description:'Disallow direct sonner toast usage' }, schema:[] },
  create(context){
    return {
      ImportDeclaration(node){
        if (node.source.value === 'sonner') {
          context.report({ node, message:'Import sonner only inside notification adapter' })
        }
      }
    }
  }
}/**
 * ESLint custom rule: no-direct-sonner
 * يمنع أي استيراد مباشر لـ 'sonner' خارج المسارات المسموح بها.
 */
module.exports = {
  rules: {
    'no-direct-sonner': {
      meta: {
        type: 'problem',
        docs: { description: 'Disallow direct sonner import; use notify facade.' },
        schema: []
      },
      create(context) {
        const allowed = [
          'lib/notifications/adapters/sonner.ts',
          'components/ui/sonner.tsx'
        ];
        return {
          ImportDeclaration(node) {
            if (node.source && node.source.value === 'sonner') {
              const filename = context.getFilename().replace(/\\/g,'/');
              const ok = allowed.some(a => filename.endsWith(a));
              if (!ok) {
                context.report({ node, message: 'Use notify facade instead of direct sonner import' });
              }
            }
          }
        }
      }
    }
  }
};
