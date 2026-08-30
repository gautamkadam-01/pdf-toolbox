/**
 * Base Engine Adapter Interface
 * Defines the standard lifecycle and contract for all conversion and processing engines.
 */

class EngineAdapter {
  /**
   * @param {string} name - Unique identifier for the adapter
   */
  constructor(name) {
    if (!name) {
      throw new Error('EngineAdapter must be instantiated with a name.');
    }
    this.name = name;
  }

  /**
   * Checks if the required system tools or libraries are available for this engine.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return true;
  }

  /**
   * Executes conversion within a managed workspace.
   * Must return an object containing at least:
   *   - buffer: Buffer (binary data)
   *   - sizeBytes: number
   *   - filename: string
   *   - mimeType: string
   * 
   * @param {Object} context
   * @param {Buffer|string} context.input - File buffer or text payload
   * @param {string} context.originalName - Source filename
   * @param {string} context.workspaceDir - Dedicated temp directory
   * @param {Object} context.options - Operation-specific options
   * @returns {Promise<Object>}
   */
  async convert(context) {
    throw new Error(`EngineAdapter '${this.name}' must implement convert() method.`);
  }
}

module.exports = EngineAdapter;
