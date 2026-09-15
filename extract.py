import docx
import sys

def extract_text(doc_path, out_path):
    doc = docx.Document(doc_path)
    fullText = []
    for para in doc.paragraphs:
        fullText.append(para.text)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(fullText))

if __name__ == '__main__':
    extract_text(sys.argv[1], sys.argv[2])
