def rank(task,candidates):
 if len(candidates)<2:return candidates,"One candidate; ranking skipped."
 try:
  import torch
  from transformers import AutoTokenizer,AutoModel
  tok=AutoTokenizer.from_pretrained("microsoft/codebert-base");model=AutoModel.from_pretrained("microsoft/codebert-base").eval()
  def emb(text):
   x=tok(text,return_tensors="pt",truncation=True,max_length=512)
   with torch.no_grad():h=model(**x).last_hidden_state
   mask=x["attention_mask"].unsqueeze(-1);v=(h*mask).sum(1)/mask.sum(1).clamp(min=1)
   return torch.nn.functional.normalize(v,p=2,dim=1)
  q=emb(task);scored=[(torch.nn.functional.cosine_similarity(q,emb(c)).item(),c) for c in candidates]
  scored.sort(reverse=True,key=lambda x:x[0])
  return [c for _,c in scored],"Ranked candidates by CodeBERT semantic similarity."
 except Exception as e:return candidates,f"CodeBERT fallback: {type(e).__name__}"
