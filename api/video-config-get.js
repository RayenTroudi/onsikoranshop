/**
 * Video Configuration GET API Endpoint
 * Returns current or historical video configuration
 * Vercel Serverless Function
 */

import { getVideoConfig, getVideoConfigHistory } from './video-config.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ success: true });
    }

    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        // Check if requesting history
        const { history, limit } = req.query;

        if (history === 'true') {
            // Return historical data
            const historyLimit = parseInt(limit) || 10;
            const historyData = await getVideoConfigHistory(historyLimit);
            
            return res.status(200).json(historyData);
        } else {
            // Return current configuration
            const config = await getVideoConfig();
            
            return res.status(200).json(config);
        }
    } catch (error) {
        console.error('Video config API error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
}
