import { supabase } from './supabase';

// Function to create the storage bucket for file uploads
export const createChatAttachmentsBucket = async (): Promise<{ success: boolean; warning?: string }> => {
  try {
    console.log('Checking for chat-attachments bucket...');
    
    // Check if the bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      console.log('Permission issue detected. Will use direct file upload instead of bucket creation.');
      return { 
        success: false, 
        warning: 'Storage permission issue detected. File uploads will use local storage instead of Supabase.' 
      };
    }
    
    console.log('Available buckets:', buckets);
    
    const bucketExists = buckets && buckets.some(bucket => bucket.name === 'chat-attachments');
    
    if (bucketExists) {
      console.log('Bucket "chat-attachments" already exists');
      
      // Try to update bucket to ensure it's public
      try {
        await supabase.storage.updateBucket('chat-attachments', {
          public: true,
          fileSizeLimit: 10485760, // 10MB limit
        });
        console.log('Bucket settings updated successfully');
        
        // Try to set public access policy
        await setPublicAccessPolicy();
      } catch (updateError) {
        console.log('Note: Could not update bucket settings, but bucket exists so continuing anyway');
      }
      
      return { success: true };
    }
    
    // If we get here, we need to create the bucket, but we might not have permission
    console.log('Bucket does not exist, but we may not have permission to create it.');
    console.log('Please create the "chat-attachments" bucket in the Supabase dashboard and set it to public.');
    
    return { 
      success: false, 
      warning: 'Please create the "chat-attachments" bucket in the Supabase dashboard and set it to public. File uploads will use local storage for now.' 
    };
    
  } catch (err) {
    console.error('Error in createChatAttachmentsBucket:', err);
    return { 
      success: false, 
      warning: 'Error checking storage bucket. File uploads will use local storage.' 
    };
  }
};

// Helper function to create the bucket
const createBucket = async () => {
  try {
    console.log('Creating chat-attachments bucket...');
    const { data, error } = await supabase.storage.createBucket('chat-attachments', {
      public: true, // Files will be publicly accessible
      fileSizeLimit: 10485760, // 10MB limit
    });
    
    if (error) {
      console.error('Error creating bucket:', error);
      return;
    }
    
    console.log('Bucket "chat-attachments" created successfully:', data);
    
    // Set public access policy
    await setPublicAccessPolicy();
  } catch (err) {
    console.error('Error creating bucket:', err);
  }
};

// Helper function to set public access policy
const setPublicAccessPolicy = async () => {
  try {
    console.log('Setting public access policy for chat-attachments bucket...');
    
    // First, check if policy exists
    const { data: policies } = await supabase
      .storage
      .from('chat-attachments')
      .getPublicUrl('test-policy-check');
      
    console.log('Current public URL capability:', policies);
    
    // Try to set public access using a direct approach
    try {
      // Create a policy that allows public access to all files
      const result = await supabase.rpc('create_storage_policy', {
        bucket_name: 'chat-attachments',
        policy_name: 'public-access',
        definition: {
          name: 'public-access',
          allow_download: true,
          allow_upload: true,
          allow_delete: true
        }
      });
      
      if ('error' in result && result.error) {
        console.log('Policy might already exist or cannot be created via RPC:', result.error);
      } else {
        console.log('Public access policy set successfully:', result);
      }
    } catch (policyError) {
      // If RPC fails, it might be because the method doesn't exist or policy already exists
      console.log('RPC method not available or policy already exists:', policyError);
    }
  } catch (err) {
    console.error('Error setting public access policy:', err);
  }
}; 