const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config'); 
const User = require('./user');
const Org = require('./organization');


const FavouriteSupplier = sequelize.define('favouriteSupplier', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    orgId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Org,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    markedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
},
{
    tableName: 'FavouriteSupplier',  
    timestamps: true,  
}
);
// Sync the model with the database (this will create the table if it doesn't exist)
    // FavouriteSupplier.sync({ force: true })
    //     .then(() => {
    //         console.log('FavouriteSupplier table has been created.');
    //     })
    //     .catch(error => {
    //         console.error('Error creating table:', error);
    //     });

module.exports = FavouriteSupplier;
