-- Audit fix M3: listing-images bucket accepts images up to 5 MB only.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/gif',
         'image/heic', 'image/heif'
       ]
 where id = 'listing-images';
