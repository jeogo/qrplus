module.exports = {
  rules: {
    'no-direct-sonner': {
      meta: {
        type: 'problem',
        docs: { description: 'منع استيراد sonner مباشرةً واستخدام notify facade بدلاً من ذلك' },
        schema: []
      },
      create(context) {
        const allowed = [
          'components/ui/sonner.tsx',
          'lib/notifications/adapters/sonner.ts'
        ];
        function isAllowed(filename){
          return allowed.some(a => filename.replace(/\\/g,'/').endsWith(a));
        }
        return {
          ImportDeclaration(node){
            if(node.source && node.source.value === 'sonner'){
              const filename = context.getFilename();
              if(!isAllowed(filename)){
                context.report({ node, message: 'Use notify facade instead of direct sonner import' });
              }
            }
          }
        }
      }
    }
  }
};
