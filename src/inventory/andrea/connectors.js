import Block from '../../models/Block';
import connectorList from './connectorList.json';

export default connectorList.map(connector => new Block(connector));
