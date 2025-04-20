import axios from 'axios';

const STORAGE_URL = 'https://objectstorage.me-jeddah-1.oraclecloud.com/p/cUidJvzOJnXy4fGP3_aYtqNVg4uvAFCJAXpKw6UGnqEcIaI0qCutoWEls5g1qNOV/n/ax4vx38nepo3/b/private-bucket/o/';

export const storage = {
  uploadFile: async (file: File, filename: string): Promise<string> => {
    try {
      console.log('Storage service: Uploading file', file.name, 'as', filename);
      
      // Upload to OCI bucket
      await axios.put(`${STORAGE_URL}${filename}`, file, {
        headers: {
          'Content-Type': file.type,
        },
      });

      // Return the full URL path
      const fullUrl = `${STORAGE_URL}${filename}`;
      console.log('Storage service: File uploaded successfully, URL:', fullUrl);
      return fullUrl;  
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  getFileUrl: (filename: string): string => {
    return `${STORAGE_URL}${filename}`;
  }
};
