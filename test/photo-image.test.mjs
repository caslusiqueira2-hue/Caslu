import assert from 'node:assert/strict';
import {test} from 'node:test';
import {preparePhotoImage} from '../public/photo-image.mjs';
test('foto usa carregamento alternativo quando createImageBitmap falha no aparelho',async(t)=>{
  const original={bitmap:globalThis.createImageBitmap,Image:globalThis.Image,document:globalThis.document,url:URL.createObjectURL,revoke:URL.revokeObjectURL};
  t.after(()=>{globalThis.createImageBitmap=original.bitmap;globalThis.Image=original.Image;globalThis.document=original.document;URL.createObjectURL=original.url;URL.revokeObjectURL=original.revoke;});
  let revoked=false,drawn=false;
  globalThis.createImageBitmap=async()=>{throw Error('unsupported');};
  globalThis.Image=class{naturalWidth=4000;naturalHeight=3000;set src(value){queueMicrotask(()=>this.onload());}};
  URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{revoked=true;};
  const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){drawn=true;}}),toDataURL:(mime)=>{assert.equal(mime,'image/jpeg');return 'data:image/jpeg;base64,converted';}};
  globalThis.document={createElement:()=>canvas};
  const result=await preparePhotoImage(new Blob(['image'],{type:'image/heic'}));
  assert.equal(result,'converted');assert.equal(canvas.width,1280);assert.equal(canvas.height,960);assert.ok(drawn);assert.ok(revoked);
});
test('foto vazia ou acima do limite é recusada antes de ser enviada',async()=>{
  await assert.rejects(()=>preparePhotoImage({size:0}),/20 MB/);
  await assert.rejects(()=>preparePhotoImage({size:21*1024*1024}),/20 MB/);
});
