import { expect,it } from 'vitest'
import { parseFrontmatter } from './frontmatter'
it('distinguishes empty lists, null, false and quoted boolean text',()=>{
 expect(parseFrontmatter('---\nempty: []\nnil: null\nflag: false\ntext: "false"\nzero: 0\n---\nBody')).toEqual({empty:[],nil:null,flag:false,text:'false',zero:0})
})
