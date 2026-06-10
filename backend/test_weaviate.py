import weaviate

client = weaviate.connect_to_local()

print("Connected:", client.is_ready())

client.close()