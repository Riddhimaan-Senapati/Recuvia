// frontend/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
// **** IMPORT THE ROUTE HANDLER HELPER and COOKIES ****
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// **** IMPORT NEEDED UTILS DIRECTLY ****
// Note: We are NOT using getSessionFromRequest from utils anymore for this route
// Import the utility function that now expects the client
import { processingStatus, insertItemWithEmbedding, VECTOR_DIMENSION } from '@/app/utils/supabase';

// For embedding generation in server
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection, env } from "@xenova/transformers";

// Configure a writable cache directory in tmp (works in Vercel)
const tmpDir = os.tmpdir();
env.cacheDir = path.join(tmpDir, '.cache', 'transformers');
console.log("Using cache directory:", env.cacheDir);

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(env.cacheDir)) {
    fs.mkdirSync(env.cacheDir, { recursive: true });
  }
} catch (err) {
  console.warn("Failed to create cache directory:", err);
}

// IMPORTANT: Use Node.js runtime with Fluid Compute
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max duration
export const preferredRegion = "auto"; // Optimize for user's region

// Smaller model with lower memory footprint
const model_id = "Xenova/clip-vit-base-patch32";

// Lazy-loaded processor and model (move outside function to maintain between requests)
let _processor: any = null;
let _model: any = null;

// Function to get processor (lazy loading)
async function getProcessor() {
  if (!_processor) {
    console.log("Initializing processor...");
    _processor = await AutoProcessor.from_pretrained(model_id);
  }
  return _processor;
}

// Function to get model (lazy loading)
async function getModel() {
  if (!_model) {
    console.log("Initializing model...");
    _model = await CLIPVisionModelWithProjection.from_pretrained(model_id);
  }
  return _model;
}

// Pre-initialize the models (this will happen once when the function is first deployed)
if (process.env.VERCEL) {
  Promise.all([getProcessor(), getModel()]).catch(console.error);
}

export async function POST(req: NextRequest) {
    console.log("Upload API called");
    let fileName = "";
    let itemId = "";
    let imageUrl = "";

    // **** CREATE REQUEST-SCOPED CLIENT ****
    const cookieStore = cookies();
    // This 'supabase' client holds the user context for THIS request
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const startTime = Date.now();

        // **** GET SESSION (using the request-scoped client) ****
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // **** AUTH CHECKS ****
        if (sessionError) {
            console.error("Session retrieval error:", sessionError.message);
            return new Response(JSON.stringify({ error: 'Server error retrieving session: ' + sessionError.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!session) {
            console.log("Authentication check failed: No active session found by Route Handler client.");
            return new Response(JSON.stringify({ error: 'No active session' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // We now know we have a valid session and user
        const user = session.user;
        console.log('Session successfully retrieved for user:', {
            user_id: user.id,
            user_email: user.email || 'No email provided'
        });


        // **** FORM DATA PROCESSING ****
        const formData = await req.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string || '';
        const location = formData.get('location') as string;
        const image = formData.get('image') as File;

        if (!title || !location || !image) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        itemId = uuidv4();
        processingStatus[itemId] = {
            status: 'processing',
            message: 'Starting upload process',
            timestamp: Date.now()
        };

        // **** STORAGE UPLOAD (using the request-scoped client) ****
        const imageBuffer = await image.arrayBuffer();
        fileName = `${itemId}-${image.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(fileName, new Uint8Array(imageBuffer));

        if (uploadError) {
            console.error("Storage upload error details:", uploadError);
            throw new Error('Storage upload error: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage
            .from('item-images')
            .getPublicUrl(fileName);

        imageUrl = urlData?.publicUrl || "";
        if (!imageUrl) {
            console.warn("Storage getPublicUrl returned empty URL for:", fileName);
            throw new Error("Failed to get public URL for uploaded image.");
        }

        // **** EMBEDDING GENERATION ****
        const processor = await getProcessor();
        const vision_model = await getModel();
        const blob = new Blob([imageBuffer], { type: image.type || 'image/jpeg' });
        const image_obj = await RawImage.fromBlob(blob);
        const image_inputs = await processor(image_obj);
        const { image_embeds } = await vision_model(image_inputs);
        const imageVector = image_embeds.tolist()[0];

        if (imageVector.length !== VECTOR_DIMENSION) {
            throw new Error(`Generated embedding dimension (${imageVector.length}) does not match expected dimension (${VECTOR_DIMENSION})`);
        }


        // **** DATABASE INSERT with RETRY ****
        const maxRetries = 3;
        let lastError: Error | unknown = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}: Inserting item for user ${user.id}`);

                // Prepare the data object
                const itemToInsert = {
                    id: itemId,
                    title: title,
                    description: description || "",
                    location: location,
                    url: imageUrl,
                    submitter_id: user.id, // Make absolutely sure user.id is correct here
                    embedding: imageVector
                };

                // Log the data being sent *just before* the call
                console.log("Data Payload for insertItemWithEmbedding:", JSON.stringify(itemToInsert, null, 2));

  
                await insertItemWithEmbedding(itemToInsert, supabase); // Pass the client with user context

                // If successful, update status and return
                processingStatus[itemId] = {
                    status: 'complete',
                    message: 'Successfully processed and stored',
                    timestamp: Date.now()
                };
                console.log(`Upload and insert successful for itemId: ${itemId}`);
                return new Response(JSON.stringify({
                    success: true,
                    itemId,
                    imageUrl,
                    processingTime: Date.now() - startTime
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (error) { // Catch errors specifically from insertItemWithEmbedding
                console.error(`Database insert attempt ${attempt} failed:`, error);
                lastError = error; // Store the error

                // Check if it's an RLS error specifically (using Supabase error code)
                if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
                    console.error("RLS Policy Violation detected. Confirm policy is correct and client context is passed.");
                    // Optionally break retry loop early for RLS errors as retrying won't help
                    // throw new Error(`RLS Policy Violation on attempt ${attempt}: ${ (error as Error).message }`);
                }


                if (attempt === maxRetries) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    throw new Error(`Failed database insert after ${maxRetries} attempts: ${errorMessage}`);
                }

                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Retrying database insert in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // This part should technically not be reached if the loop always throws or returns
        if (lastError) throw lastError;


    } catch (error) { // General catch block
        console.error("Unhandled error in POST /api/upload:", error);
        if (itemId) {
            processingStatus[itemId] = {
                status: 'error',
                message: error instanceof Error ? error.message : String(error) || 'Unknown server error',
                timestamp: Date.now()
            };
        }
        return new Response(JSON.stringify({
            error: 'Upload failed: ' + (error instanceof Error ? error.message : String(error))
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// OPTIONS handler
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust in production if needed
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization' // Allow necessary headers
    }
  });
}