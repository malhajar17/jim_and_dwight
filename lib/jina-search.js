import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Jina API integration for real search results
 * Finds actual LinkedIn profiles and contact information
 */
export class JinaSearchAPI {
  constructor() {
    this.apiKey = process.env.JINA_API_KEY;
    this.baseUrl = 'https://s.jina.ai/';
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * Check if Jina API is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.apiKey && this.apiKey !== 'your_jina_api_key_here');
  }

  /**
   * Search using Jina API
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return (default 10)
   * @returns {Promise<Array>} Search results
   */
  async search(query, maxResults = 10) {
    if (!this.isConfigured()) {
      throw new Error('Jina API key not configured');
    }

    try {
      console.log(`🔍 Jina API search: "${query}"`);
      
      // Format query for URL (replace spaces with +)
      const formattedQuery = query.replace(/\s+/g, '+');
      
      const response = await axios.get(`${this.baseUrl}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'X-Respond-With': 'no-content'
        },
        timeout: this.timeout,
        params: {
          'q': formattedQuery
        }
      });

      // Parse Jina response and extract structured data
      let responseText;
      if (typeof response.data === 'string') {
        responseText = response.data;
      } else if (Buffer.isBuffer(response.data)) {
        responseText = response.data.toString('utf8');
      } else {
        responseText = JSON.stringify(response.data);
      }
      
      const searchResults = this.parseJinaResponse(responseText, query, maxResults);
      
      console.log(`✅ Jina returned ${searchResults.length} results`);
      return searchResults;

    } catch (error) {
      console.error(`❌ Jina API error: ${error.message}`);
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
      }
      
      // Return empty results on error
      return [];
    }
  }

  /**
   * Parse Jina API response and extract lead information
   * @param {string} data - Raw response from Jina
   * @param {string} originalQuery - Original search query
   * @param {number} maxResults - Maximum results to extract
   * @returns {Array} Parsed lead data
   */
  parseJinaResponse(data, originalQuery, maxResults) {
    const leads = [];
    
    try {
      let responseObj;
      
      // Parse the JSON response
      if (typeof data === 'string') {
        responseObj = JSON.parse(data);
      } else {
        responseObj = data;
      }
      
      // Check if the response has the expected structure
      if (!responseObj.data || !Array.isArray(responseObj.data)) {
        console.log('⚠️ Unexpected response format from Jina API');
        return leads;
      }
      
      console.log(`📊 Jina returned ${responseObj.data.length} raw results`);
      
      // Process each result from the API
      for (let i = 0; i < Math.min(responseObj.data.length, maxResults); i++) {
        const item = responseObj.data[i];
        
        // Skip items without basic required fields
        if (!item.title) continue;
        
        // For search results, we want to return the actual search results with URLs
        // This is different from the lead generation parsing
        if (originalQuery.includes('rocket reach')) {
          // This is a RocketReach search - return raw results with URLs
          leads.push({
            url: item.url,
            title: item.title,
            description: item.description || '',
            content: item.content || ''
          });
          continue;
        }
        
        // Regular lead generation parsing (non-RocketReach searches)
        if (!item.url) continue;
        
        // Extract name from title
        const name = this.extractNameFromTitle(item.title);
        
        // Extract job title from title
        const jobTitle = this.extractJobTitleFromTitle(item.title);
        
        // Extract company from description
        const company = this.extractCompanyFromDescription(item.description || '');
        
        // Generate potential email
        const potentialEmail = this.generateEmailFromNameAndCompany(name, company);
        
        leads.push({
          id: `jina_lead_${Date.now()}_${i}`,
          name: name,
          title: jobTitle,
          company: company,
          email: potentialEmail,
          linkedin_url: item.url,
          location: 'France',
          source: 'jina_search',
          search_query: originalQuery,
          confidence_score: this.calculateConfidenceFromItem(item),
          contact_verified: false,
          notes: `Found via Jina search: "${originalQuery}"`,
          found_at: new Date().toISOString(),
          lead_status: 'new',
          raw_data: item.description ? item.description.substring(0, 300) : ''
        });
      }

      return leads;

    } catch (error) {
      console.error('Error parsing Jina response:', error.message);
      return [];
    }
  }

  /**
   * Extract company from description text
   * @param {string} description 
   * @returns {string}
   */
  extractCompanyFromDescription(description) {
    if (!description) return 'Financial Services Company';
    
    // Look for company names in description
    const companyPatterns = [
      /(?:at|chez)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.)/i,
      /(Banque de France|BNP|Société Générale|Crédit Agricole|Allianz|AXA|Europ Assistance)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Financial Services Company';
  }

  /**
   * Calculate confidence score from item data
   * @param {Object} item 
   * @returns {number}
   */
  calculateConfidenceFromItem(item) {
    let score = 0.5; // Base score
    
    if (item.url && item.url.includes('linkedin.com')) score += 0.2;
    if (item.description && item.description.length > 50) score += 0.1;
    if (item.title && (item.title.includes('CIO') || item.title.includes('Director'))) score += 0.1;
    if (item.description && item.description.includes('Banque')) score += 0.1;
    
    return Math.min(1.0, score);
  }

  /**
   * Extract person name from LinkedIn title
   * @param {string} title 
   * @returns {string}
   */
  extractNameFromTitle(title) {
    // Pattern: "Daniel Cukier - IT Director CIO - CTO | Financial services - LinkedIn"
    const nameMatch = title.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*-/);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    // Fallback: take first two words if they look like names
    const words = title.split(/\s+/);
    if (words.length >= 2 && /^[A-Z]/.test(words[0]) && /^[A-Z]/.test(words[1])) {
      return `${words[0]} ${words[1]}`;
    }
    
    return 'Professional';
  }

  /**
   * Extract job title from LinkedIn title
   * @param {string} title 
   * @returns {string}
   */
  extractJobTitleFromTitle(title) {
    // Look for common job titles after the name
    const titlePatterns = [
      /- (Chief Information Officer|CIO|Chief Technology Officer|CTO|IT Director|Director|Manager)[^|]*/i,
      /- ([^-|]+(?:Officer|Director|Manager|Head)[^-|]*)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Technology Executive';
  }

  /**
   * Generate potential email from name and company
   * @param {string} name 
   * @param {string} company 
   * @returns {string}
   */
  generateEmailFromNameAndCompany(name, company) {
    const nameParts = name.toLowerCase().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    // Generate company domain
    let domain = company.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z]/g, '')
      .substring(0, 15);
    
    if (domain.includes('banque')) domain = 'banque-france';
    else if (domain.includes('allianz')) domain = 'allianz';
    else if (domain.includes('axa')) domain = 'axa';
    else domain += '.com';
    
    return `${firstName}.${lastName}@${domain}.fr`;
  }

  /**
   * Search for specific person to get more information
   * @param {string} name - Person's name
   * @param {string} title - Person's job title  
   * @param {string} company - Person's company
   * @param {number} maxResults - Maximum results to return (default 5)
   * @returns {Promise<Array>} Search results
   */
  async searchForPerson(name, title, company, maxResults = 5) {
    if (!this.isConfigured()) {
      throw new Error('Jina API key not configured');
    }

    try {
      // Create simple search query without quotes (matching successful main search format)
      const query = `${name} ${company} LinkedIn profile`;
      console.log(`🔍 Searching specifically for person: "${query}"`);
      
      const formattedQuery = query;
      
      const response = await axios.get(`${this.baseUrl}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'X-Respond-With': 'no-content'
        },
        timeout: this.timeout,
        params: {
          'q': formattedQuery
        }
      });

      // Parse response
      let responseObj;
      if (typeof response.data === 'string') {
        responseObj = JSON.parse(response.data);
      } else {
        responseObj = response.data;
      }
      
      if (!responseObj.data || !Array.isArray(responseObj.data)) {
        return [];
      }
      
      // Filter results to only include those that actually mention the person's name
      const relevantResults = responseObj.data.filter(result => {
        const nameInTitle = result.title && result.title.toLowerCase().includes(name.toLowerCase());
        const nameInDesc = result.description && result.description.toLowerCase().includes(name.toLowerCase());
        return nameInTitle || nameInDesc;
      });
      
      console.log(`📊 Found ${relevantResults.length} results specifically about ${name} (filtered from ${responseObj.data.length} total)`);
      return relevantResults.slice(0, maxResults);

    } catch (error) {
      console.error(`❌ Error searching for ${name}:`, error.message);
      return [];
    }
  }

  /**
   * Read website content using Jina's reader API
   * @param {string} url - Website URL to read
   * @returns {Promise<string>} Website content
   */
  async readWebsite(url) {
    if (!this.isConfigured()) {
      throw new Error('Jina API key not configured');
    }

    try {
      console.log(`📖 Reading website: ${url}`);
      
      const readerUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
      
      const response = await axios.get(readerUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'text/plain'
        },
        timeout: this.timeout * 2 // Longer timeout for reading content
      });

      const content = response.data;
      console.log(`✅ Read ${content.length} characters from ${url}`);
      
      return content;

    } catch (error) {
      console.error(`❌ Error reading website ${url}:`, error.message);
      return '';
    }
  }

  /**
   * Enrich a lead with additional information from web sources
   * @param {Object} lead - Lead object to enrich
   * @returns {Promise<Object>} Enriched lead object
   */
  async enrichLeadWithAdditionalInfo(lead) {
    try {
      console.log(`🔍 Enriching lead: ${lead.name} (${lead.title})`);
      
      const enrichmentData = {
        search_results: [],
        website_content: {},
        additional_info: {
          background: '',
          experience: '',
          skills: [],
          achievements: [],
          current_projects: [],
          company_info: '',
          contact_methods: []
        },
        enriched_at: new Date().toISOString()
      };

      // 1. Search for more information about the person
      const searchResults = await this.searchForPerson(
        lead.name, 
        lead.title, 
        lead.company, 
        5
      );
      
      enrichmentData.search_results = searchResults;

      // 2. Read their LinkedIn profile if available
      if (lead.linkedin_url) {
        try {
          console.log(`📖 Reading LinkedIn profile for ${lead.name}`);
          const linkedinContent = await this.readWebsite(lead.linkedin_url);
          
          if (linkedinContent) {
            enrichmentData.website_content.linkedin = linkedinContent;
            
            // Extract key information from LinkedIn content
            const linkedinInfo = this.extractLinkedInInfo(linkedinContent);
            Object.assign(enrichmentData.additional_info, linkedinInfo);
          }
        } catch (error) {
          console.error(`⚠️ Could not read LinkedIn for ${lead.name}:`, error.message);
        }
      }

      // 3. Read content from other relevant websites found in search
      const websitesToRead = searchResults
        .filter(result => result.url && !result.url.includes('linkedin.com'))
        .slice(0, 2); // Limit to 2 additional websites to avoid rate limits

      for (const website of websitesToRead) {
        try {
          const content = await this.readWebsite(website.url);
          if (content) {
            const domain = new URL(website.url).hostname;
            enrichmentData.website_content[domain] = content;
            
            // Extract relevant information
            const websiteInfo = this.extractWebsiteInfo(content, lead.name);
            this.mergeAdditionalInfo(enrichmentData.additional_info, websiteInfo);
          }
          
          // Add delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`⚠️ Could not read ${website.url}:`, error.message);
        }
      }

      // 4. Update the lead with enriched information
      const enrichedLead = {
        ...lead,
        enrichment: enrichmentData,
        confidence_score: Math.min(1.0, lead.confidence_score + 0.1), // Slight boost for enriched leads
        last_enriched: new Date().toISOString()
      };

      console.log(`✅ Enriched ${lead.name} with ${Object.keys(enrichmentData.website_content).length} sources`);
      
      return enrichedLead;

    } catch (error) {
      console.error(`❌ Error enriching lead ${lead.name}:`, error.message);
      // Return original lead if enrichment fails
      return {
        ...lead,
        enrichment_error: error.message,
        enrichment_attempted_at: new Date().toISOString()
      };
    }
  }

  /**
   * Extract information from LinkedIn content
   * @param {string} content - LinkedIn page content
   * @returns {Object} Extracted information
   */
  extractLinkedInInfo(content) {
    const info = {
      background: '',
      experience: '',
      skills: [],
      achievements: [],
      current_projects: []
    };

    try {
      // Extract experience/background information
      const experienceMatch = content.match(/Experience[.\s\S]*?(?=Education|Skills|About|$)/i);
      if (experienceMatch) {
        info.experience = experienceMatch[0].substring(0, 500);
      }

      // Extract skills
      const skillsMatch = content.match(/Skills[.\s\S]*?(?=Experience|Education|About|$)/i);
      if (skillsMatch) {
        const skillsText = skillsMatch[0];
        const skillMatches = skillsText.match(/\b[A-Z][a-zA-Z\s]+(?:Management|Development|Technology|Systems|Strategy|Digital|Analytics|Security)\b/g);
        if (skillMatches) {
          info.skills = skillMatches.slice(0, 10);
        }
      }

      // Extract about/summary information
      const aboutMatch = content.match(/About[.\s\S]*?(?=Experience|Skills|Education|$)/i);
      if (aboutMatch) {
        info.background = aboutMatch[0].substring(0, 300);
      }

      // Look for achievements/accomplishments
      const achievementKeywords = ['led', 'managed', 'delivered', 'achieved', 'implemented', 'reduced', 'increased', 'transformed'];
      const sentences = content.split(/[.!?]+/);
      
      for (const sentence of sentences) {
        if (achievementKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
          if (sentence.length > 20 && sentence.length < 200) {
            info.achievements.push(sentence.trim());
            if (info.achievements.length >= 3) break;
          }
        }
      }

    } catch (error) {
      console.error('Error extracting LinkedIn info:', error.message);
    }

    return info;
  }

  /**
   * Extract relevant information from website content
   * @param {string} content - Website content
   * @param {string} personName - Name of the person to look for
   * @returns {Object} Extracted information
   */
  extractWebsiteInfo(content, personName) {
    const info = {
      background: '',
      experience: '',
      achievements: [],
      company_info: ''
    };

    try {
      // Look for mentions of the person
      const nameRegex = new RegExp(personName.replace(/\s+/g, '\\s+'), 'gi');
      const sentences = content.split(/[.!?]+/);
      
      const relevantSentences = sentences.filter(sentence => 
        nameRegex.test(sentence) && sentence.length > 20 && sentence.length < 300
      );

      // Extract the most relevant information
      if (relevantSentences.length > 0) {
        info.background = relevantSentences.slice(0, 2).join('. ').trim();
      }

      // Look for company/organization information
      const companyPatterns = [
        /(?:company|organization|firm|corporation)[^.]*?[.]/gi,
        /(?:founded|established|serves|provides)[^.]*?[.]/gi
      ];

      for (const pattern of companyPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          info.company_info = matches[0].substring(0, 200);
          break;
        }
      }

    } catch (error) {
      console.error('Error extracting website info:', error.message);
    }

    return info;
  }

  /**
   * Merge additional information into existing info object
   * @param {Object} existing - Existing information
   * @param {Object} newInfo - New information to merge
   */
  mergeAdditionalInfo(existing, newInfo) {
    if (newInfo.background && !existing.background) {
      existing.background = newInfo.background;
    }
    
    if (newInfo.experience && !existing.experience) {
      existing.experience = newInfo.experience;
    }
    
    if (newInfo.company_info && !existing.company_info) {
      existing.company_info = newInfo.company_info;
    }
    
    if (newInfo.achievements && newInfo.achievements.length > 0) {
      existing.achievements = [...existing.achievements, ...newInfo.achievements].slice(0, 5);
    }
  }


} 