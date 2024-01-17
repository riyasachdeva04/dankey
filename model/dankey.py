from sentence_transformers import SentenceTransformer, util
import pandas as pd
import sys

text = sys.argv[1] # meme context here, aka pass the text from the chat as an argument to this script, first arg is the script name itself

df = pd.read_csv('memegenerator.csv')
# df.head()

df = df.drop(['Meme ID', 'Archived URL', 'MD5 Hash', 'File Size (In Bytes)'], axis=1)
# df.head()

custom_headers = ['file_name', 'link', 'text', 'text2', 'sentiment', 'sarcasm', 'offensive', 'motivational', 'positive/negative']
df2 = pd.read_excel('data_7000_actual.xlsx', header=None, names=custom_headers)

# df2.head()

df2 = df2.drop(['file_name', 'text2', ], axis=1)

df2['text']=df2['text'].str.lower()
# df2.head()
# df2.info()

# df.info()

df['Alternate Text'] = df['Alternate Text'].apply(lambda x: str(x) if x is not None else "")

#dataset 1

# def get_meme1(text):

#     # Load the Universal Sentence Encoder
#     model = SentenceTransformer('paraphrase-MiniLM-L6-v2')

#     # Encode messages and meme texts
#     message_embedding = model.encode(text)
#     meme_embeddings = model.encode(df['Alternate Text'].astype(str).tolist())

#     # Calculate cosine similarity
#     similarities = util.pytorch_cos_sim(message_embedding, meme_embeddings)[0]

#     # Find the index of the most similar meme
#     most_similar_index = similarities.argmax().item()

#     # Get the most similar meme text
#     most_similar_meme = df['Alternate Text'][most_similar_index]

#     print("Most similar meme:", most_similar_meme)

#     return most_similar_index

# indx = get_meme1(text)
# link = df['Meme Page URL'][indx]

# print(link)

# def modify_url(link):
    # if link.startswith("http://webarchive"):
        # index = link.find("http", len("http://webarchive"))

        # if index != -1:
            # new_link = link[index:]
            # return new_link
    # return link


# link1 = modify_url(link)

# print(link)

# df2.head()

df2['sentiment'].value_counts()

df2 = df2[df2['sentiment'] != 'not_funny']
df2 = df2.reset_index(drop=True)

df2['sentiment'].value_counts()

df2['sarcasm'].value_counts()

df2 = df2[df2['sarcasm'] != 'not_sarcastic']
df2 = df2.reset_index(drop=True)

def get_meme2(text):

    # Load the Universal Sentence Encoder
    model = SentenceTransformer('paraphrase-MiniLM-L6-v2')

    # Encode messages and meme texts
    message_embedding = model.encode(text)
    meme_embeddings = model.encode(df2['text'].astype(str).tolist())

    # Calculate cosine similarity
    similarities = util.pytorch_cos_sim(message_embedding, meme_embeddings)[0]

    # Find the index of the most similar meme
    most_similar_index = similarities.argmax().item()

    # Get the most similar meme text
    most_similar_meme = df2['text'][most_similar_index]

    print("Most similar meme:", most_similar_meme)

    return most_similar_index

indx2 = get_meme2(text)
link2 = df2['link'][indx2]

print(link2)

# import random
# final_link = random.choice([link1, link2])

# print(final_link)